"""
LinkedIn API client for publishing posts and uploading images.

Encapsulates all LinkedIn REST API interactions including post creation,
image upload initialization, image binary upload, and error handling.
Uses httpx.AsyncClient with configurable timeout for all requests.
"""

import httpx
import logging
from models.publisher import LinkedInPostResponse, LinkedInImageUploadResponse

logger = logging.getLogger(__name__)

LINKEDIN_API_BASE = "https://api.linkedin.com/rest"
LINKEDIN_VERSION = "202603"
RESTLI_PROTOCOL_VERSION = "2.0.0"

# Map LinkedIn HTTP status codes to internal error codes
_ERROR_CODE_MAP = {
    400: "validation_error",
    401: "token_expired",
    403: "access_denied",
    429: "rate_limited",
    500: "linkedin_server_error",
    503: "linkedin_server_error",
}


class LinkedInClient:
    """Encapsulates all LinkedIn REST API interactions."""

    def __init__(self, timeout_seconds: int = 30):
        self.timeout = timeout_seconds

    def _headers(self, access_token: str) -> dict:
        """Standard headers for all LinkedIn API requests."""
        return {
            "Authorization": f"Bearer {access_token}",
            "Linkedin-Version": LINKEDIN_VERSION,
            "X-Restli-Protocol-Version": RESTLI_PROTOCOL_VERSION,
            "Content-Type": "application/json",
        }

    def format_commentary(self, content: str, hashtags: list[str]) -> str:
        """
        Combine post content with hashtags into commentary text.
        Prefixes each hashtag with '#' if not already prefixed.
        Returns content unchanged if hashtags list is empty.
        """
        if not hashtags:
            return content

        formatted_tags = []
        for tag in hashtags:
            if tag.startswith("#"):
                formatted_tags.append(tag)
            else:
                formatted_tags.append(f"#{tag}")

        return f"{content} {' '.join(formatted_tags)}"

    def _map_error(self, status_code: int, response_text: str) -> LinkedInPostResponse:
        """Map an HTTP error response to a LinkedInPostResponse."""
        error_code = _ERROR_CODE_MAP.get(status_code, "linkedin_server_error")
        return LinkedInPostResponse(
            status_code=status_code,
            error_code=error_code,
            error_message=response_text[:500] if response_text else f"HTTP {status_code}",
        )

    def _build_post_body(
        self, person_urn: str, commentary: str, image_urn: str | None = None
    ) -> dict:
        """Build the LinkedIn Posts API request body."""
        body = {
            "author": person_urn,
            "commentary": commentary,
            "visibility": "PUBLIC",
            "distribution": {
                "feedDistribution": "MAIN_FEED",
                "targetEntities": [],
                "thirdPartyDistributionChannels": [],
            },
            "lifecycleState": "PUBLISHED",
            "isReshareDisabledByAuthor": False,
        }
        if image_urn:
            body["content"] = {"media": {"id": image_urn}}
        return body

    async def create_text_post(
        self, access_token: str, person_urn: str, commentary: str
    ) -> LinkedInPostResponse:
        """
        POST https://api.linkedin.com/rest/posts
        Creates a text-only post. Returns structured response with status code
        and post ID (from x-restli-id header) on success.
        """
        url = f"{LINKEDIN_API_BASE}/posts"
        body = self._build_post_body(person_urn, commentary)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url, headers=self._headers(access_token), json=body
                )

            if response.status_code == 201:
                post_id = response.headers.get("x-restli-id")
                return LinkedInPostResponse(
                    status_code=201, post_id=post_id
                )

            return self._map_error(response.status_code, response.text)

        except httpx.TimeoutException as e:
            logger.error(f"Timeout creating text post: {e}")
            return LinkedInPostResponse(
                status_code=0,
                error_code="network_error",
                error_message=f"Request timed out: {e}",
            )
        except httpx.HTTPError as e:
            logger.error(f"Network error creating text post: {e}")
            return LinkedInPostResponse(
                status_code=0,
                error_code="network_error",
                error_message=f"Network error: {e}",
            )

    async def initialize_image_upload(
        self, access_token: str, person_urn: str
    ) -> LinkedInImageUploadResponse:
        """
        POST https://api.linkedin.com/rest/images?action=initializeUpload
        Returns upload URL and image URN.
        """
        url = f"{LINKEDIN_API_BASE}/images?action=initializeUpload"
        body = {"initializeUploadRequest": {"owner": person_urn}}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url, headers=self._headers(access_token), json=body
                )

            if response.status_code in (200, 201):
                data = response.json()
                value = data.get("value", {})
                return LinkedInImageUploadResponse(
                    upload_url=value["uploadUrl"],
                    image_urn=value["image"],
                )

            error_msg = f"Image upload init failed with status {response.status_code}: {response.text[:500]}"
            logger.error(error_msg)
            raise Exception(error_msg)

        except (httpx.TimeoutException, httpx.HTTPError) as e:
            logger.error(f"Network error initializing image upload: {e}")
            raise Exception(f"Network error initializing image upload: {e}") from e

    async def upload_image_binary(
        self, upload_url: str, image_data: bytes, content_type: str
    ) -> int:
        """
        PUT to the upload URL with raw image bytes.
        Returns HTTP status code.
        """
        headers = {
            "Content-Type": content_type,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.put(
                    upload_url, headers=headers, content=image_data
                )

            if response.status_code not in (200, 201):
                error_msg = f"Image binary upload failed with status {response.status_code}: {response.text[:500]}"
                logger.error(error_msg)
                raise Exception(error_msg)

            return response.status_code

        except (httpx.TimeoutException, httpx.HTTPError) as e:
            logger.error(f"Network error uploading image binary: {e}")
            raise Exception(f"Network error uploading image binary: {e}") from e

    async def create_image_post(
        self, access_token: str, person_urn: str, commentary: str, image_urn: str
    ) -> LinkedInPostResponse:
        """
        POST https://api.linkedin.com/rest/posts
        Creates a post with an image attachment. Same as text post but includes
        content.media.id field with the image URN.
        """
        url = f"{LINKEDIN_API_BASE}/posts"
        body = self._build_post_body(person_urn, commentary, image_urn=image_urn)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url, headers=self._headers(access_token), json=body
                )

            if response.status_code == 201:
                post_id = response.headers.get("x-restli-id")
                return LinkedInPostResponse(
                    status_code=201, post_id=post_id
                )

            return self._map_error(response.status_code, response.text)

        except httpx.TimeoutException as e:
            logger.error(f"Timeout creating image post: {e}")
            return LinkedInPostResponse(
                status_code=0,
                error_code="network_error",
                error_message=f"Request timed out: {e}",
            )
        except httpx.HTTPError as e:
            logger.error(f"Network error creating image post: {e}")
            return LinkedInPostResponse(
                status_code=0,
                error_code="network_error",
                error_message=f"Network error: {e}",
            )
