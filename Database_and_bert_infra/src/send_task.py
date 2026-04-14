from src.worker import extraction_task
import time
def test_pipeline():
    # A list of test cases to verify different parts of your engine
    test_cases = [
        {
            "url": "https://techcrunch.com/2026/04/11/nasa-lunar-mission-success-artemis-ii/", 
            "source": "Hindustan Times"
        },
        {
            "url": "https://timesofindia.indiatimes.com/science/nasas-artemis-ii-crew-returns-to-earth-with-pacific-splashdown-near-californias-san-diego/articleshow/130182394.cms",
            "source": "TOI News"
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