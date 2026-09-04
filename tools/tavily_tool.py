from tavily import TavilyClient
import os
from dotenv import load_dotenv

load_dotenv()
client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

def tavily_search(query:str):
    response = client.search(
        query=query,
        max_results=6
    )

    result= []
    return response