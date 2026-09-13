import os
import uuid
import asyncio
from urllib import response
import certifi
from dotenv import load_dotenv

load_dotenv()
os.environ["SSL_CERT_FILE"] = certifi.where()    
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

from typing import TypedDict, Annotated
import operator
import psycopg
from psycopg.rows import dict_row

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.postgres import PostgresSaver

from langchain_core.messages import(
    AnyMessage,
    SystemMessage,
    AIMessage,
    HumanMessage,
)
from langchain_groq import ChatGroq
# from tools.tavily_tool import tavily_search
from tools.flight_tool import search_flights

from mcp_client_test import tavily_mcp_search

# Database URL
def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError(
            "DATABASE_URL environment variable is not set. Please set it in your .env file."
        )
    if "sslmode=" not in database_url:
        separator = "&" if "?" in database_url else "?"
        # URL er end a sslmode=require add korchhi karon, render a remote database e connect korar somoy sslmode require korte hoy. Jodi sslmode already thake, tahole abar add korbo na.
        database_url = f"{database_url}{separator}sslmode=require"

    return database_url

GROQ_API_KEY= os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError(
        "GROQ_API_KEY environment variable is not set. Please set it in your .env file."
    )

# LLM
llm= ChatGroq(
    model="qwen/qwen3.8-27b",
    api_key=GROQ_API_KEY
)

# State for langgraph
class TravelState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]
    user_query: str
    flight_results: str
    hotel_results: str
    itinerary: str
    llm_calls: int  # Call counter for LLM calls


# FLIGHT AGENT
def flight_agent(state: TravelState):
    query = state["user_query"]
    flight_data = search_flights(query)

    return {
        "flight_results": flight_data,
        "messages": [
            AIMessage(content=f"Flight search results: {flight_data}"),
        ],
        "llm_calls": state.get("llm_calls", 0) + 1,
    }


# HOTEL AGENT
def hotel_agent(state: TravelState):
    query = f"Best hotels for {state['user_query']}"
    # hotel_results = tavily_search(query)

    # Using the remote MCP server to fetch hotel results instead of the direct tavily_search custom function
    hotel_results = asyncio.run(tavily_mcp_search(query))

    return {
        "hotel_results": hotel_results,
        "messages": [
            AIMessage(content="Hotel information fetched.")
        ],
        "llm_calls": state.get("llm_calls", 0) + 1,
    }


# ITINERARY AGENT
def itinerary_agent(state: TravelState):
    prompt = f"""
    Create a complete travel itinerary.

    User Query:
    {state['user_query']}

    Flight Results:
    {state['flight_results']}

    Hotel Results:
    {state['hotel_results']}

    Make the itinerary practical, budget-aware, and easy to follow.
    """

    response = llm.invoke([
        SystemMessage(content="You are an expert travel planner."),
        HumanMessage(content=prompt),
    ])

    return {
        "itinerary": response.content,
        "messages": [response],
        "llm_calls": state.get("llm_calls", 0) + 1,
    }


# FINAL AGENT
def final_agent(state: TravelState):
    final_text = state.get("itinerary", "") or "No itinerary generated yet."
    return {
        "messages": [AIMessage(content=final_text)],
        "itinerary": final_text,
    }


# Building the state graph for langgraph
graph = StateGraph(TravelState)

graph.add_node("flight_agent", flight_agent)
graph.add_node("hotel_agent", hotel_agent)
graph.add_node("itinerary_agent", itinerary_agent)
graph.add_node("final_agent", final_agent)

graph.add_edge(START, "flight_agent")
graph.add_edge("flight_agent", "hotel_agent")
graph.add_edge("hotel_agent", "itinerary_agent")
graph.add_edge("itinerary_agent", "final_agent")
graph.add_edge("final_agent", END)

# Checkpointing with Postgres
DATABASE_URL = get_database_url()

_conn = psycopg.connect(
    DATABASE_URL,
    autocommit=True,
    row_factory=dict_row
)
# checkpointing setup
checkpointer = PostgresSaver(_conn)
checkpointer.setup()
# Compile the graph with checkpointing and sabing the state to the database
travel_graph = graph.compile(checkpointer=checkpointer)

# FASTAPI function to run the travel agent
def run_travel_agent(user_input: str, thread_id: str | None = None):
    if not thread_id:
        thread_id = f"user_{uuid.uuid4().hex}"

    config = {
        "configurable": {
            "thread_id": thread_id
        }
    }

    result = travel_graph.invoke(
        {
            "messages": [
                HumanMessage(content=user_input)
            ],
            "user_query": user_input,
            "flight_results": "",
            "hotel_results": "",
            "itinerary": "",
            "llm_calls": 0
        },
        config=config
    )

    final_answer = result["messages"][-1].content

    return {
        "thread_id": thread_id,
        "answer": final_answer,
        "flight_results": result.get("flight_results", ""),
        "hotel_results": result.get("hotel_results", ""),
        "itinerary": result.get("itinerary", ""),
        "llm_calls": result.get("llm_calls", 0),
    }


    