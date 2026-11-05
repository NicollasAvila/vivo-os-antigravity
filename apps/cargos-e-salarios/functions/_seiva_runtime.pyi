# Type stubs for App Functions — DO NOT IMPORT AT RUNTIME.
#
# `code_runner_python` injects `input` and `context` into
# `def run(input, context=None): ...` directly; this file exists only
# so Pyright/Pylance can autocomplete the values inside your editor.
#
# The runtime sandbox enforces an import whitelist (see
# `code_runner_python/app.py:44-74`); imports outside that list will
# fail at execution time even if they pass type-checking here.

from typing import Any, TypedDict, NotRequired

class SeivaContext(TypedDict, total=False):
    # Resolved server-side from the function's `required_credential_types`.
    # Each key matches a credential type name; the value is the decrypted
    # secret as posted by `Seiva.Credentials.resolve_for_call/4`.
    credentials: dict[str, Any]
    # Workspace UUID the calling App belongs to. Useful when integrating
    # with workspace-scoped APIs.
    workspace_id: NotRequired[str]
    # Authenticated user id from the `X-Seiva-User-Id` header on the
    # incoming `/api/v1/apps/fn/<name>` request. May be the App's own
    # id when the SDK runs without an end-user context.
    user_id: NotRequired[str]

# `run` is the only entry point recognised by the sandbox. The
# signature may take one or two positional arguments:
#   def run(input): ...
#   def run(input, context=None): ...
# Anything else is rejected at extraction time in the build pipeline.
def run(input: dict[str, Any], context: SeivaContext | None = None) -> Any: ...
