#!/usr/bin/env python3
"""
Check AWS Bedrock model access status using credentials from .env file.
"""
import boto3
from botocore.exceptions import ClientError
import sys
import os

# Add parent directory to path to import config
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import settings


def check_bedrock_access():
    """Check if we have access to Bedrock models."""
    print("=" * 70)
    print("AWS BEDROCK ACCESS CHECKER")
    print("=" * 70)
    
    print(f"\n📋 Configuration:")
    print(f"   Region: {settings.aws_region}")
    print(f"   Using .env credentials: {bool(settings.aws_access_key_id)}")
    
    try:
        # Create boto3 session with credentials from .env
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            session = boto3.Session(
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                region_name=settings.aws_region
            )
            print("   Credential source: .env file")
        else:
            session = boto3.Session(region_name=settings.aws_region)
            print("   Credential source: Default AWS credential chain")
        
        # Create Bedrock client
        client = session.client('bedrock', region_name=settings.aws_region)
        
        print("\n✅ Successfully connected to AWS Bedrock")
        
        # List available models
        print("\n📋 Checking Anthropic Claude models...")
        response = client.list_foundation_models(
            byProvider='anthropic'
        )
        
        models = response.get('modelSummaries', [])
        
        if not models:
            print("❌ No Anthropic models found")
            return False
        
        print(f"\nFound {len(models)} Anthropic models:")
        print("-" * 70)
        
        active_models = []
        for model in models:
            model_id = model.get('modelId', 'Unknown')
            model_name = model.get('modelName', 'Unknown')
            status = model.get('modelLifecycle', {}).get('status', 'Unknown')
            
            status_icon = "✅" if status == "ACTIVE" else "⚠️"
            print(f"{status_icon} {model_name}")
            print(f"   ID: {model_id}")
            print(f"   Status: {status}")
            
            if status == "ACTIVE":
                active_models.append(model_id)
            
            print()
        
        if not active_models:
            print("❌ No ACTIVE models found")
            print(f"\n⚠️  You need to request model access in the AWS Bedrock Console:")
            print(f"   https://console.aws.amazon.com/bedrock/home?region={settings.aws_region}#/modelaccess")
            return False
        
        # Test if we can actually invoke a model
        print("=" * 70)
        print("TESTING MODEL INVOCATION")
        print("=" * 70)
        
        test_model = "anthropic.claude-3-haiku-20240307-v1:0"
        if test_model not in active_models:
            test_model = active_models[0]
        
        print(f"\nTesting model: {test_model}")
        
        runtime_client = session.client('bedrock-runtime', region_name=settings.aws_region)
        
        try:
            response = runtime_client.converse(
                modelId=test_model,
                messages=[
                    {
                        "role": "user",
                        "content": [{"text": "Say 'test successful' in 2 words"}]
                    }
                ]
            )
            
            print("✅ Model invocation successful!")
            print(f"Response: {response['output']['message']['content'][0]['text']}")
            
            print("\n" + "=" * 70)
            print("✅ ALL CHECKS PASSED")
            print("=" * 70)
            print("\nYou have full access to AWS Bedrock!")
            print("You can now use the real Strategist Agent.")
            return True
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']
            
            print(f"\n❌ Model invocation failed:")
            print(f"   Error: {error_code}")
            print(f"   Message: {error_message}")
            
            if "use case details" in error_message.lower():
                print("\n⚠️  ACTION REQUIRED:")
                print("   You need to fill out the Anthropic use case form:")
                print(f"   1. Go to: https://console.aws.amazon.com/bedrock/home?region={settings.aws_region}#/modelaccess")
                print("   2. Click 'Manage model access'")
                print("   3. Select Anthropic models")
                print("   4. Fill out the use case form")
                print("   5. Wait for approval (usually instant)")
            
            return False
            
    except ClientError as e:
        print(f"\n❌ AWS Error: {e}")
        print("\nMake sure:")
        print("  1. Your AWS credentials are in python/.env file")
        print("  2. You have permissions to access Bedrock")
        print(f"  3. You're using the correct region ({settings.aws_region})")
        return False
        
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False


if __name__ == "__main__":
    success = check_bedrock_access()
    sys.exit(0 if success else 1)
