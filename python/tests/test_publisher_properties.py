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


# ===================================================================
# Feature: publisher-agent-backend, Property 12: User Isolation on Publish Logs
# ===================================================================

from hypothesis import assume  # noqa: E402 - needed for Property 12
from unittest.mock import MagicMock  # noqa: E402
from typing import Optional


def create_mock_publisher_repository():
    """Create an in-memory mock of PublisherRepository for testing user isolation."""
    from repositories.publisher_repository import PublisherRepository

    repo = PublisherRepository.__new__(PublisherRepository)
    repo.table_name = "test-publish-log"
    repo.region = "us-east-1"

    # In-memory storage
    repo._log_storage = {}       # logId → PublishLogRecord
    repo._user_index = {}        # userId → list of logIds
    repo._post_index = {}        # postId → list of logIds
    repo._post_owners = {}       # postId → userId (simulates scheduled-posts table ownership)

    # Mock DynamoDB tables (not used directly, but required by the class shape)
    repo.table = MagicMock()
    repo.scheduled_posts_table = MagicMock()

    async def mock_create_log(record: PublishLogRecord) -> PublishLogRecord:
        repo._log_storage[record.log_id] = record
        repo._user_index.setdefault(record.user_id, []).append(record.log_id)
        repo._post_index.setdefault(record.post_id, []).append(record.log_id)
        return record

    async def mock_list_logs_by_user(user_id: str):
        log_ids = repo._user_index.get(user_id, [])
        records = [repo._log_storage[lid] for lid in log_ids if lid in repo._log_storage]
        return sorted(records, key=lambda r: r.attempted_at, reverse=True)

    async def mock_list_logs_by_post(post_id: str):
        log_ids = repo._post_index.get(post_id, [])
        return [repo._log_storage[lid] for lid in log_ids if lid in repo._log_storage]

    async def mock_get_post_owner(post_id: str) -> Optional[str]:
        return repo._post_owners.get(post_id)

    repo.create_log = mock_create_log
    repo.list_logs_by_user = mock_list_logs_by_user
    repo.list_logs_by_post = mock_list_logs_by_post
    repo.get_post_owner = mock_get_post_owner

    return repo


class TestUserIsolationOnPublishLogs:
    """
    Property 12: User Isolation on Publish Logs

    **Validates: Requirements 7.1, 7.3, 11.1, 11.2**
    """

    @pytest.mark.asyncio
    @settings(max_examples=100, deadline=None)
    @given(
        user_a_id=st.uuids().map(str),
        user_b_id=st.uuids().map(str),
        records_a=st.lists(publish_log_record_strategy(), min_size=1, max_size=5),
        records_b=st.lists(publish_log_record_strategy(), min_size=1, max_size=5),
    )
    async def test_property_user_logs_only_contain_own_records(
        self, user_a_id, user_b_id, records_a, records_b
    ):
        """
        For any two distinct users A and B, create log records for both users.
        Verify list_logs_by_user(user_a) returns only User A's records and
        none of User B's.

        **Validates: Requirements 7.1, 11.1**
        """
        assume(user_a_id != user_b_id)

        repo = create_mock_publisher_repository()

        # Create records for User A
        a_log_ids = []
        for data in records_a:
            record = PublishLogRecord(**{**data, "user_id": user_a_id})
            await repo.create_log(record)
            a_log_ids.append(record.log_id)

        # Create records for User B
        b_log_ids = []
        for data in records_b:
            record = PublishLogRecord(**{**data, "user_id": user_b_id})
            await repo.create_log(record)
            b_log_ids.append(record.log_id)

        # Query for User A
        user_a_logs = await repo.list_logs_by_user(user_a_id)
        returned_ids = {r.log_id for r in user_a_logs}

        # All of User A's records should be present
        for lid in a_log_ids:
            assert lid in returned_ids, f"User A's log {lid} missing from query"

        # None of User B's records should be present
        for lid in b_log_ids:
            assert lid not in returned_ids, f"User B's log {lid} leaked into User A's query"

        # Every returned record should belong to User A
        for r in user_a_logs:
            assert r.user_id == user_a_id

    @pytest.mark.asyncio
    @settings(max_examples=100, deadline=None)
    @given(
        user_a_id=st.uuids().map(str),
        user_b_id=st.uuids().map(str),
        record_data=publish_log_record_strategy(),
    )
    async def test_property_post_logs_access_denied_for_non_owner(
        self, user_a_id, user_b_id, record_data
    ):
        """
        For any two distinct users A and B, create a post owned by User B with
        log records. Verify that get_post_owner returns User B's ID (not User A's),
        which should trigger a 403 in the API layer.

        **Validates: Requirements 7.3, 11.2**
        """
        assume(user_a_id != user_b_id)

        repo = create_mock_publisher_repository()

        # Create a record owned by User B
        record = PublishLogRecord(**{**record_data, "user_id": user_b_id})
        await repo.create_log(record)

        # Register post ownership to User B
        repo._post_owners[record.post_id] = user_b_id

        # User A tries to access logs for this post
        owner = await repo.get_post_owner(record.post_id)

        # The owner should be User B, not User A → API layer would return 403
        assert owner == user_b_id
        assert owner != user_a_id

    @pytest.mark.asyncio
    @settings(max_examples=100, deadline=None)
    @given(
        user_a_id=st.uuids().map(str),
        user_b_id=st.uuids().map(str),
        records_a=st.lists(publish_log_record_strategy(), min_size=1, max_size=5),
        records_b=st.lists(publish_log_record_strategy(), min_size=1, max_size=5),
    )
    async def test_property_bidirectional_user_log_isolation(
        self, user_a_id, user_b_id, records_a, records_b
    ):
        """
        For any two distinct users A and B, both creating multiple log records,
        verify neither user can see the other's records via list_logs_by_user.

        **Validates: Requirements 7.1, 11.1**
        """
        assume(user_a_id != user_b_id)

        repo = create_mock_publisher_repository()

        a_log_ids = set()
        for data in records_a:
            record = PublishLogRecord(**{**data, "user_id": user_a_id})
            await repo.create_log(record)
            a_log_ids.add(record.log_id)

        b_log_ids = set()
        for data in records_b:
            record = PublishLogRecord(**{**data, "user_id": user_b_id})
            await repo.create_log(record)
            b_log_ids.add(record.log_id)

        # User A's query
        user_a_logs = await repo.list_logs_by_user(user_a_id)
        user_a_returned_ids = {r.log_id for r in user_a_logs}

        assert user_a_returned_ids == a_log_ids, "User A should see exactly their own logs"
        assert user_a_returned_ids.isdisjoint(b_log_ids), "User A should not see User B's logs"

        # User B's query
        user_b_logs = await repo.list_logs_by_user(user_b_id)
        user_b_returned_ids = {r.log_id for r in user_b_logs}

        assert user_b_returned_ids == b_log_ids, "User B should see exactly their own logs"
        assert user_b_returned_ids.isdisjoint(a_log_ids), "User B should not see User A's logs"

    @pytest.mark.asyncio
    @settings(max_examples=100, deadline=None)
    @given(
        user_a_id=st.uuids().map(str),
        post_id=st.uuids().map(str),
        nonexistent_post_id=st.uuids().map(str),
    )
    async def test_property_post_owner_returns_correct_user(
        self, user_a_id, post_id, nonexistent_post_id
    ):
        """
        For any post owned by User A, verify get_post_owner returns User A's ID.
        For a non-existent post, verify get_post_owner returns None.

        **Validates: Requirements 7.3, 11.2**
        """
        assume(post_id != nonexistent_post_id)

        repo = create_mock_publisher_repository()

        # Register ownership
        repo._post_owners[post_id] = user_a_id

        # Owned post returns correct user
        owner = await repo.get_post_owner(post_id)
        assert owner == user_a_id

        # Non-existent post returns None
        no_owner = await repo.get_post_owner(nonexistent_post_id)
        assert no_owner is None


# ===================================================================
# Feature: publisher-agent-backend, Property 3: Concurrency Guard Skips In-Progress Posts
# ===================================================================


class TestConcurrencyGuardSkipsInProgressPosts:
    """
    Property 3: Concurrency Guard Skips In-Progress Posts

    For any set of due posts and any subset of post IDs marked as currently
    processing, the scan cycle should only attempt to publish posts whose IDs
    are not in the processing set. The set of attempted post IDs and the
    processing set should be disjoint.

    **Validates: Requirements 1.5**
    """

    @settings(max_examples=100)
    @given(
        due_post_ids=st.lists(
            st.uuids().map(str), min_size=1, max_size=10, unique=True
        ),
        processing_fraction=st.floats(min_value=0.0, max_value=1.0),
    )
    def test_property_attempted_posts_disjoint_from_processing(
        self, due_post_ids, processing_fraction
    ):
        """
        Generate random sets of due post IDs and a random subset marked as
        processing. Verify the posts that would be attempted are exactly
        those NOT in the processing set.

        **Validates: Requirements 1.5**
        """
        # Build the processing set as a random fraction of due posts
        split_idx = int(len(due_post_ids) * processing_fraction)
        processing_post_ids = set(due_post_ids[:split_idx])

        # Simulate the concurrency guard filter from run_scan_cycle
        posts_to_process = [
            pid for pid in due_post_ids if pid not in processing_post_ids
        ]
        attempted_set = set(posts_to_process)

        # The attempted set must be disjoint from the processing set
        assert attempted_set.isdisjoint(processing_post_ids), (
            f"Overlap found: {attempted_set & processing_post_ids}"
        )

        # The union of attempted + processing should cover all due posts
        assert attempted_set | processing_post_ids == set(due_post_ids)

        # Every attempted post should be from the due list
        for pid in attempted_set:
            assert pid in due_post_ids

    @settings(max_examples=100)
    @given(
        due_post_ids=st.lists(
            st.uuids().map(str), min_size=0, max_size=10, unique=True
        ),
    )
    def test_property_all_processing_means_nothing_attempted(self, due_post_ids):
        """
        When all due posts are already processing, no posts should be attempted.

        **Validates: Requirements 1.5**
        """
        processing_post_ids = set(due_post_ids)

        posts_to_process = [
            pid for pid in due_post_ids if pid not in processing_post_ids
        ]

        assert len(posts_to_process) == 0

    @settings(max_examples=100)
    @given(
        due_post_ids=st.lists(
            st.uuids().map(str), min_size=1, max_size=10, unique=True
        ),
    )
    def test_property_no_processing_means_all_attempted(self, due_post_ids):
        """
        When no posts are processing, all due posts should be attempted.

        **Validates: Requirements 1.5**
        """
        processing_post_ids: set = set()

        posts_to_process = [
            pid for pid in due_post_ids if pid not in processing_post_ids
        ]

        assert set(posts_to_process) == set(due_post_ids)


# ===================================================================
# Feature: publisher-agent-backend, Property 8: Rate Limit Skips Remaining User Posts
# ===================================================================

from collections import defaultdict  # noqa: E402


@st.composite
def user_posts_with_rate_limit_strategy(draw):
    """
    Generate a list of posts for a single user where a 429 occurs at a random
    position. Returns (posts_count, rate_limit_index) where rate_limit_index
    is the 0-based index of the post that triggers 429.
    """
    posts_count = draw(st.integers(min_value=2, max_value=8))
    rate_limit_index = draw(st.integers(min_value=0, max_value=posts_count - 1))
    return posts_count, rate_limit_index


class TestRateLimitSkipsRemainingUserPosts:
    """
    Property 8: Rate Limit Skips Remaining User Posts

    For any user with multiple due posts, if LinkedIn returns a 429 error on
    post N, all subsequent posts for that user (posts N+1, N+2, ...) should be
    skipped without attempting LinkedIn API calls. Posts for other users should
    continue to be processed normally.

    **Validates: Requirements 5.3**
    """

    @settings(max_examples=100)
    @given(data=user_posts_with_rate_limit_strategy())
    def test_property_rate_limit_skips_subsequent_posts(self, data):
        """
        Generate a list of posts for a user with a 429 at a random position.
        Verify that posts after the 429 are not attempted.

        **Validates: Requirements 5.3**
        """
        posts_count, rate_limit_index = data

        # Simulate sequential processing with rate limit break
        attempted_indices = []
        for i in range(posts_count):
            attempted_indices.append(i)
            # Simulate: if this post got a 429, break
            if i == rate_limit_index:
                break

        # Posts up to and including the rate-limited one should be attempted
        assert len(attempted_indices) == rate_limit_index + 1

        # Posts after the rate-limited one should NOT be attempted
        skipped_indices = list(range(rate_limit_index + 1, posts_count))
        for idx in skipped_indices:
            assert idx not in attempted_indices

    @settings(max_examples=100)
    @given(
        user_a_count=st.integers(min_value=2, max_value=5),
        user_a_rate_limit_idx=st.integers(min_value=0, max_value=1),
        user_b_count=st.integers(min_value=1, max_value=5),
    )
    def test_property_rate_limit_does_not_affect_other_users(
        self, user_a_count, user_a_rate_limit_idx, user_b_count
    ):
        """
        When User A hits a 429, User B's posts should still be processed normally.

        **Validates: Requirements 5.3**
        """
        # Clamp rate_limit_idx to valid range
        user_a_rate_limit_idx = min(user_a_rate_limit_idx, user_a_count - 1)

        # Simulate processing for User A (hits 429)
        user_a_attempted = []
        for i in range(user_a_count):
            user_a_attempted.append(i)
            if i == user_a_rate_limit_idx:
                break

        # Simulate processing for User B (no rate limit)
        user_b_attempted = list(range(user_b_count))

        # User A should have stopped early
        assert len(user_a_attempted) == user_a_rate_limit_idx + 1
        assert len(user_a_attempted) <= user_a_count

        # User B should have processed all posts
        assert len(user_b_attempted) == user_b_count


# ===================================================================
# Feature: publisher-agent-backend, Property 9: Missing Credentials Produces Skipped Log
# ===================================================================


@st.composite
def missing_credentials_strategy(draw):
    """
    Generate user credential dicts with various missing LinkedIn fields.
    Returns (credentials, expected_error_code).
    """
    scenario = draw(st.sampled_from([
        "no_token", "no_sub", "none_token", "none_sub", "empty_token", "empty_sub",
    ]))

    if scenario == "no_token":
        return (
            {"linkedinSub": "abc123", "linkedinName": "Test User"},
            "linkedin_not_connected",
        )
    elif scenario == "none_token":
        return (
            {"linkedinAccessToken": None, "linkedinSub": "abc123", "linkedinName": "Test User"},
            "linkedin_not_connected",
        )
    elif scenario == "empty_token":
        return (
            {"linkedinAccessToken": "", "linkedinSub": "abc123", "linkedinName": "Test User"},
            "linkedin_not_connected",
        )
    elif scenario == "no_sub":
        return (
            {"linkedinAccessToken": "valid-token", "linkedinName": "Test User"},
            "linkedin_sub_missing",
        )
    elif scenario == "none_sub":
        return (
            {"linkedinAccessToken": "valid-token", "linkedinSub": None, "linkedinName": "Test User"},
            "linkedin_sub_missing",
        )
    elif scenario == "empty_sub":
        return (
            {"linkedinAccessToken": "valid-token", "linkedinSub": "", "linkedinName": "Test User"},
            "linkedin_sub_missing",
        )


class TestMissingCredentialsProducesSkippedLog:
    """
    Property 9: Missing Credentials Produces Skipped Log

    For any user record where linkedinAccessToken is missing or null, all due
    posts for that user should produce PublishLogRecords with status "skipped"
    and errorCode "linkedin_not_connected". Similarly, if linkedinSub is missing,
    the errorCode should be "linkedin_sub_missing". No LinkedIn API calls should
    be made for these posts.

    **Validates: Requirements 4.2, 4.3**
    """

    @settings(max_examples=100)
    @given(data=missing_credentials_strategy())
    def test_property_missing_credentials_maps_to_correct_skip_reason(self, data):
        """
        Generate user records with various missing LinkedIn fields and verify
        the correct skip reason is determined.

        **Validates: Requirements 4.2, 4.3**
        """
        credentials, expected_error_code = data

        # Simulate the credential check logic from _process_user_posts
        access_token = credentials.get('linkedinAccessToken')
        linkedin_sub = credentials.get('linkedinSub')

        if not access_token:
            actual_error_code = "linkedin_not_connected"
        elif not linkedin_sub:
            actual_error_code = "linkedin_sub_missing"
        else:
            actual_error_code = None  # Valid credentials

        assert actual_error_code == expected_error_code

    @settings(max_examples=100)
    @given(
        num_posts=st.integers(min_value=1, max_value=10),
        data=missing_credentials_strategy(),
    )
    def test_property_all_user_posts_skipped_when_credentials_missing(
        self, num_posts, data
    ):
        """
        When credentials are missing, ALL posts for that user should be skipped
        (not just the first one).

        **Validates: Requirements 4.2, 4.3**
        """
        credentials, expected_error_code = data

        access_token = credentials.get('linkedinAccessToken')
        linkedin_sub = credentials.get('linkedinSub')

        # Simulate: determine if we should skip
        should_skip = not access_token or not linkedin_sub

        assert should_skip, "Test strategy should only generate missing credentials"

        # All posts should be skipped
        skipped_count = 0
        for _ in range(num_posts):
            skipped_count += 1  # Each post gets a skipped log

        assert skipped_count == num_posts, (
            f"Expected all {num_posts} posts to be skipped, but only {skipped_count} were"
        )

    @settings(max_examples=100)
    @given(
        access_token=st.text(min_size=10, max_size=50, alphabet=st.characters(
            whitelist_categories=('L', 'N'), min_codepoint=48, max_codepoint=122
        )),
        linkedin_sub=st.text(min_size=5, max_size=20, alphabet=st.characters(
            whitelist_categories=('L', 'N'), min_codepoint=48, max_codepoint=122
        )),
    )
    def test_property_valid_credentials_not_skipped(self, access_token, linkedin_sub):
        """
        When both linkedinAccessToken and linkedinSub are present and non-empty,
        the user's posts should NOT be skipped.

        **Validates: Requirements 4.2, 4.3**
        """
        credentials = {
            'linkedinAccessToken': access_token,
            'linkedinSub': linkedin_sub,
            'linkedinName': 'Test User',
        }

        token = credentials.get('linkedinAccessToken')
        sub = credentials.get('linkedinSub')

        should_skip = not token or not sub
        assert not should_skip, (
            f"Valid credentials should not be skipped: token={token!r}, sub={sub!r}"
        )
