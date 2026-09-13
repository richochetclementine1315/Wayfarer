# from tools.tavily_tool import tavily_search
# from tools.flight_tool import search_flights
# from backend import run_travel_agent

# # res = tavily_search("Best Hotels in India")
# # print(res)

# # res= search_flights("Plan a 7 days Switzerland trip from India")
# # print(res)

# # res= run_travel_agent()
# # print(res)

# user_input = input("Enter your travel query: ")
# response = run_travel_agent(
#     user_input=user_input,
#     thread_id="test_user"
#     )

# print("\nFINAL RESPONSE:\n")
# print(response["answer"])

import asyncio
from mcp_client_test import get_all_tools, tavily_mcp_search

if __name__ == "__main__":
    query = "Best Hotels in Switzerland"
    asyncio.run(tavily_mcp_search(query))