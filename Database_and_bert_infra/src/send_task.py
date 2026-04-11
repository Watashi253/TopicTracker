from worker import extraction_task
import time
def test_pipeline():
    # A list of test cases to verify different parts of your engine
    test_cases = [
        {
            "url": "https://www.reuters.com/technology/artificial-intelligence/", 
            "source": "Reuters"
        },
        {
            "url": "https://www.bbc.com/news/business-68923415", 
            "source": "BBC News"
        }
    ]
    print("🚀 Initializing Pipeline Test...")
    for case in test_cases:
        url = case["url"]
        source = case["source"]
        print(f"📦 Queuing: {url} (Source: {source})")
        # This sends the task to Redis
        extraction_task.delay(url, source)
        # Small sleep to avoid overwhelming the logs
        time.sleep(1)
    print("\n✅ All tasks successfully pushed to Redis.")
    print("👉 Switch to your Celery Worker terminal to watch the extraction!")
if __name__ == "__main__":
    test_pipeline()