"""
Property-based tests for publisher models.

Property 11: Publish Log Record Completeness and Validation
Validates: Requirements 6.2, 10.5
"""

import pytest
from hypothesis import given, settings, strategies as st
from pydantic import ValidationError
from uuid import UUID
from datetime import datetime

from models.publisher import (
    PublishLogRecord,
    LinkedInPostRequest,
    LinkedInPostResponse,
    LinkedInImageUploadResponse,
)

# Valid statuses for publish log records
VALID_STATUSES = ["published", "failed", "skipped"]


@st.composite
def publish_log_record_strategy(draw):
    """Generate random valid PublishLogRecord data."""
    status = draw(st.sampled_from(VALID_STATUSES))
    linkedin_post_id = None
    error_code = None
    error_message = None

    if status == "published":
        linkedin_post_id = f"urn:li:share:{draw(st.integers(min_value=1, max_value=999999999))}"
    elif status == "failed":
        error_code = draw(st.sampled_from([
            "token_expired", "access_denied", "rate_limited",
            "validation_error", "linkedin_server_error", "network_error",
            "s3_download_error", "image_upload_init_error", "image_upload_error",
        ]))
        error_message = draw(st.text(min_size=1, max_size=100, alphabet=st.characters(blacklist_categories=('Cs', 'Cc'))))
    elif status == "skipped":
        error_code = draw(st.sampled_from(["linkedin_not_connected", "linkedin_sub_missing"]))

    return {
        "post_id": str(draw(st.uuids())),
        "user_id": str(draw(st.uuids())),
        "platform": "linkedin",
        "status": status,
        "linkedin_post_id": linkedin_post_id,
        "error_code": error_code,
        "error_message": error_message,
    }


class TestPublishLogRecordCompleteness:
    """
    Property 11: Publish Log Record Completeness and Validation

    Validates: Requirements 6.2, 10.5
    """

    @settings(max_examples=100, deadline=None)
    @given(data=publish_log_record_strategy())
    def test_property_all_required_fields_present(self, data):
        """
        For any valid publish outcome, the resulting PublishLogRecord
        must contain all required fields with correct types.
        """
        record = PublishLogRecord(**data)

        # log_id: auto-generated valid UUID
        assert record.log_id is not None
        UUID(record.log_id)  # raises if invalid

        # post_id and user_id preserved
        assert record.post_id == data["post_id"]
        assert record.user_id == data["user_id"]

        # platform
        assert record.platform == "linkedin"

        # status is one of the allowed values
        assert record.status in VALID_STATUSES

        # attempted_at: auto-generated datetime
        assert isinstance(record.attempted_at, datetime)

        # Conditional fields match the status
        if record.status == "published":
            assert record.linkedin_post_id is not None
        if record.status == "failed":
            assert record.error_code is not None

    @settings(max_examples=100, deadline=None)
    @given(
        invalid_status=st.text(min_size=1, max_size=30, alphabet=st.characters(blacklist_categories=('Cs', 'Cc')))
        .filter(lambda s: s.strip() not in VALID_STATUSES)
    )
    def test_property_invalid_status_rejected(self, invalid_status):
        """
        For any status string that is not "published", "failed", or "skipped",
        PublishLogRecord construction must raise a ValidationError.
        """
        with pytest.raises(ValidationError):
            PublishLogRecord(
                post_id="test-post",
                user_id="test-user",
                status=invalid_status,
            )

    @settings(max_examples=50, deadline=None)
    @given(status=st.sampled_from(VALID_STATUSES))
    def test_property_valid_status_accepted(self, status):
        """
        For any of the three valid statuses, PublishLogRecord construction
        must succeed without error.
        """
        record = PublishLogRecord(
            post_id="test-post",
            user_id="test-user",
            status=status,
        )
        assert record.status == status

    @settings(max_examples=50, deadline=None)
    @given(data=publish_log_record_strategy())
    def test_property_log_ids_are_unique(self, data):
        """
        Two independently created PublishLogRecords must have distinct log_id values.
        """
        record1 = PublishLogRecord(**data)
        record2 = PublishLogRecord(**data)
        assert record1.log_id != record2.log_id


# ---------------------------------------------------------------------------
# Additional imports for Properties 4–7
# ---------------------------------------------------------------------------
import httpx
from unittest.mock import AsyncMock, patch
import asyncio

from services.linkedin_client import (
    LinkedInClient,
    _ERROR_CODE_MAP,
    LINKEDIN_VERSION,
    RESTLI_PROTOCOL_VERSION,
)


# ===================================================================
# Feature: publisher-agent-backend, Property 4: Commentary Formatting with Hashtags
# ===================================================================

# Strategy: printable strings without leading/trailing whitespace issues
_printable_text = st.text(
    min_size=1,
    max_size=200,
    alphabet=st.characters(whitelist_categories=("L", "N", "P", "S", "Z"), blacklist_characters="\x00"),
)

_hashtag_word = st.text(
    min_size=1,
    max_size=30,
    alphabet=st.characters(whitelist_categories=("L", "N")),
)


@st.composite
def hashtag_strategy(draw):
    """Generate a hashtag that may or may not already have a '#' prefix."""
    word = draw(_hashtag_word)
    prefix = draw(st.sampled_from(["", "#"]))
    return f"{prefix}{word}"


class TestCommentaryFormattingWithHashtags:
    """
    Property 4: Commentary Formatting with Hashtags

    Validates: Requirements 12.1, 12.2, 12.3, 2.3, 9.8
    """

    def setup_method(self):
        self.client = LinkedInClient()

    @settings(max_examples=100, deadline=None)
    @given(content=_printable_text)
    def test_empty_hashtags_returns_content_unchanged(self, content):
        """Empty hashtags list → content returned unchanged."""
        result = self.client.format_commentary(content, [])
        assert result == content

    @settings(max_examples=100, deadline=None)
    @given(content=_printable_text, tags=st.lists(hashtag_strategy(), min_size=1, max_size=10))
    def test_non_empty_hashtags_appended_with_hash_prefix(self, content, tags):
        """Non-empty hashtags → each appended with '#' prefix."""
        result = self.client.format_commentary(content, tags)

        # Result must start with the original content
        assert result.startswith(content)

        # The suffix after content should contain every tag with '#' prefix
        suffix = result[len(content):]
        for tag in tags:
            expected_tag = tag if tag.startswith("#") else f"#{tag}"
            assert expected_tag in suffix

    @settings(max_examples=100, deadline=None)
    @given(content=_printable_text, tags=st.lists(hashtag_strategy(), min_size=1, max_size=10))
    def test_no_double_hash_prefix(self, content, tags):
        """No hashtag in the output should have '##' double prefix."""
        result = self.client.format_commentary(content, tags)
        assert "##" not in result


# ===================================================================
# Feature: publisher-agent-backend, Property 5: LinkedIn Request Headers and Author URN
# ===================================================================

_token_text = st.text(
    min_size=1,
    max_size=200,
    alphabet=st.characters(whitelist_categories=("L", "N")),
)

_linkedin_sub = st.text(
    min_size=1,
    max_size=50,
    alphabet=st.characters(whitelist_categories=("L", "N")),
)


class TestLinkedInRequestHeadersAndAuthorURN:
    """
    Property 5: LinkedIn Request Headers and Author URN

    Validates: Requirements 2.2, 2.5, 9.6, 9.7
    """

    def setup_method(self):
        self.client = LinkedInClient()

    @settings(max_examples=100, deadline=None)
    @given(access_token=_token_text)
    def test_headers_contain_correct_authorization(self, access_token):
        """Headers must include Authorization: Bearer {access_token}."""
        headers = self.client._headers(access_token)
        assert headers["Authorization"] == f"Bearer {access_token}"

    @settings(max_examples=100, deadline=None)
    @given(access_token=_token_text)
    def test_headers_contain_linkedin_version(self, access_token):
        """Headers must include Linkedin-Version matching the constant."""
        headers = self.client._headers(access_token)
        assert headers["Linkedin-Version"] == LINKEDIN_VERSION

    @settings(max_examples=100, deadline=None)
    @given(access_token=_token_text)
    def test_headers_contain_restli_protocol_version(self, access_token):
        """Headers must include X-Restli-Protocol-Version matching the constant."""
        headers = self.client._headers(access_token)
        assert headers["X-Restli-Protocol-Version"] == RESTLI_PROTOCOL_VERSION

    @settings(max_examples=100, deadline=None)
    @given(access_token=_token_text)
    def test_headers_contain_content_type_json(self, access_token):
        """Headers must include Content-Type: application/json."""
        headers = self.client._headers(access_token)
        assert headers["Content-Type"] == "application/json"

    @settings(max_examples=100, deadline=None)
    @given(linkedin_sub=_linkedin_sub)
    def test_author_urn_format(self, linkedin_sub):
        """Post body author field must equal urn:li:person:{linkedinSub}."""
        person_urn = f"urn:li:person:{linkedin_sub}"
        body = self.client._build_post_body(person_urn, "test commentary")
        assert body["author"] == f"urn:li:person:{linkedin_sub}"


# ===================================================================
# Feature: publisher-agent-backend, Property 6: Text vs Image Post Routing
# ===================================================================

_commentary_text = st.text(
    min_size=1,
    max_size=200,
    alphabet=st.characters(whitelist_categories=("L", "N", "P", "Z"), blacklist_characters="\x00"),
)

_image_urn = st.text(
    min_size=1,
    max_size=100,
    alphabet=st.characters(whitelist_categories=("L", "N", "P")),
).map(lambda s: f"urn:li:image:{s}")


class TestTextVsImagePostRouting:
    """
    Property 6: Text vs Image Post Routing

    Validates: Requirements 2.1, 3.1, 3.4, 3.5
    """

    def setup_method(self):
        self.client = LinkedInClient()

    @settings(max_examples=100, deadline=None)
    @given(person_urn=_linkedin_sub.map(lambda s: f"urn:li:person:{s}"), commentary=_commentary_text)
    def test_text_only_post_has_no_content_key(self, person_urn, commentary):
        """When image_urn is None, the body must NOT contain a 'content' key."""
        body = self.client._build_post_body(person_urn, commentary, image_urn=None)
        assert "content" not in body

    @settings(max_examples=100, deadline=None)
    @given(
        person_urn=_linkedin_sub.map(lambda s: f"urn:li:person:{s}"),
        commentary=_commentary_text,
        image_urn=_image_urn,
    )
    def test_image_post_has_content_media_id(self, person_urn, commentary, image_urn):
        """When image_urn is provided, body['content']['media']['id'] must equal image_urn."""
        body = self.client._build_post_body(person_urn, commentary, image_urn=image_urn)
        assert "content" in body
        assert body["content"]["media"]["id"] == image_urn

    @settings(max_examples=100, deadline=None)
    @given(
        person_urn=_linkedin_sub.map(lambda s: f"urn:li:person:{s}"),
        commentary=_commentary_text,
        image_urn=_image_urn,
    )
    def test_both_paths_share_identical_base_fields(self, person_urn, commentary, image_urn):
        """Text-only and image post bodies must have identical base fields."""
        text_body = self.client._build_post_body(person_urn, commentary, image_urn=None)
        img_body = self.client._build_post_body(person_urn, commentary, image_urn=image_urn)

        base_keys = ["author", "commentary", "visibility", "distribution", "lifecycleState", "isReshareDisabledByAuthor"]
        for key in base_keys:
            assert text_body[key] == img_body[key], f"Mismatch on base field '{key}'"


# ===================================================================
# Feature: publisher-agent-backend, Property 7: LinkedIn Error Code Mapping
# ===================================================================

_response_text = st.text(
    min_size=0,
    max_size=300,
    alphabet=st.characters(blacklist_categories=("Cs", "Cc")),
)


class TestLinkedInErrorCodeMapping:
    """
    Property 7: LinkedIn Error Code Mapping

    Validates: Requirements 5.1, 5.2, 5.4, 5.5, 5.6
    """

    def setup_method(self):
        self.client = LinkedInClient()

    @settings(max_examples=100, deadline=None)
    @given(
        status_code=st.sampled_from([400, 401, 403, 429, 500, 503]),
        response_text=_response_text,
    )
    def test_error_status_codes_map_correctly(self, status_code, response_text):
        """Each LinkedIn error status code must map to the correct internal error code."""
        result = self.client._map_error(status_code, response_text)

        expected_code = _ERROR_CODE_MAP[status_code]
        assert result.error_code == expected_code
        assert result.status_code == status_code
        assert result.post_id is None

    @settings(max_examples=100, deadline=None)
    @given(response_text=_response_text)
    def test_401_maps_to_token_expired(self, response_text):
        """401 → token_expired."""
        result = self.client._map_error(401, response_text)
        assert result.error_code == "token_expired"

    @settings(max_examples=100, deadline=None)
    @given(response_text=_response_text)
    def test_403_maps_to_access_denied(self, response_text):
        """403 → access_denied."""
        result = self.client._map_error(403, response_text)
        assert result.error_code == "access_denied"

    @settings(max_examples=100, deadline=None)
    @given(response_text=_response_text)
    def test_400_maps_to_validation_error(self, response_text):
        """400 → validation_error."""
        result = self.client._map_error(400, response_text)
        assert result.error_code == "validation_error"

    @settings(max_examples=100, deadline=None)
    @given(
        status_code=st.sampled_from([500, 503]),
        response_text=_response_text,
    )
    def test_500_503_maps_to_linkedin_server_error(self, status_code, response_text):
        """500 and 503 → linkedin_server_error."""
        result = self.client._map_error(status_code, response_text)
        assert result.error_code == "linkedin_server_error"

    @settings(max_examples=100, deadline=None)
    @given(access_token=_token_text)
    def test_network_error_produces_network_error_code(self, access_token):
        """httpx exceptions during create_text_post → error_code='network_error'."""
        # Patch httpx.AsyncClient to raise a network error
        with patch("services.linkedin_client.httpx.AsyncClient") as mock_client_cls:
            mock_instance = AsyncMock()
            mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
            mock_instance.__aexit__ = AsyncMock(return_value=False)
            mock_instance.post = AsyncMock(side_effect=httpx.ConnectError("connection refused"))
            mock_client_cls.return_value = mock_instance

            result = asyncio.get_event_loop().run_until_complete(
                self.client.create_text_post(access_token, "urn:li:person:test", "hello")
            )

        assert result.error_code == "network_error"
        assert result.status_code == 0
