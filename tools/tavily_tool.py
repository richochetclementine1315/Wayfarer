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

    results= []
    # Running a forloop on the response and only taking the content forom search result rather than useless metadata 
    for i, r in enumerate(response["results"], 1):
        title = r.get("title", "Unknown")
        url = r.get("url", " ")
        snippet = r.get("content", " ").strip()

        # Keeping 300 first charecters to avoid wall of text
        if len(snippet)>300:
            snippet= snippet[:300].rsplit(" ", 1)[0] + "..."

        results.append(f"{i}. **{title}**\n  {url}\n {snippet}")

    return "\n\n".join(results)        