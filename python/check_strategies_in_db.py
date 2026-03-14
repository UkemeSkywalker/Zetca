"""
Check what strategies exist in DynamoDB
Run with: python check_strategies_in_db.py
"""

import boto3
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Configuration
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
TABLE_NAME = os.getenv("DYNAMODB_STRATEGIES_TABLE", "strategies-dev")

print(f"=== Checking Strategies in DynamoDB ===")
print(f"Region: {AWS_REGION}")
print(f"Table: {TABLE_NAME}\n")

try:
    # Initialize DynamoDB
    dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
    table = dynamodb.Table(TABLE_NAME)
    
    # Scan all items (for debugging only - not recommended for production)
    response = table.scan()
    items = response.get('Items', [])
    
    print(f"Total strategies found: {len(items)}\n")
    
    if len(items) == 0:
        print("No strategies in database.")
    else:
        # Group by user_id
        users = {}
        for item in items:
            user_id = item.get('userId', 'unknown')
            if user_id not in users:
                users[user_id] = []
            users[user_id].append(item)
        
        print(f"Strategies by user:")
        for user_id, strategies in users.items():
            print(f"\n  User ID: {user_id}")
            print(f"  Count: {len(strategies)}")
            for strategy in strategies:
                print(f"    - {strategy.get('brandName', 'N/A')} (ID: {strategy.get('strategyId', 'N/A')[:8]}...)")
                print(f"      Created: {strategy.get('createdAt', 'N/A')}")
    
except Exception as e:
    print(f"ERROR: {e}")
    print("\nMake sure:")
    print("1. AWS credentials are configured")
    print("2. DynamoDB table exists")
    print("3. You have permission to access the table")
