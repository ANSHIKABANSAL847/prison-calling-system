import os
import sys

# Setup environment variables needed by SpeechBrain
os.environ["SB_DISABLE_SYMLINKS"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS"] = "1"
os.environ["SPEECHBRAIN_CACHE_DIR"] = os.path.abspath("audio_cache")

# Apply huggingface patch for local execution
import huggingface_hub
original_hf_hub_download = huggingface_hub.hf_hub_download
def patched_hf_hub_download(*args, **kwargs):
    kwargs.pop('use_auth_token', None)
    repo_id = kwargs.get('repo_id') or (args[0] if len(args) > 0 else "")
    filename = kwargs.get('filename') or (args[1] if len(args) > 1 else "")
    if filename == "custom.py":
        import requests
        class MockRequest: pass
        class MockResponse:
            status_code = 404
            request = MockRequest()
        err = requests.exceptions.HTTPError("404 Client Error")
        err.response = MockResponse()
        raise err
    try:
        return original_hf_hub_download(*args, **kwargs)
    except Exception as e:
        if "404" in str(e) or "not found" in str(e).lower() or isinstance(e, huggingface_hub.utils.EntryNotFoundError):
            import requests
            class MockRequest: pass
            class MockResponse:
                status_code = 404
                request = MockRequest()
            err = requests.exceptions.HTTPError("404 Client Error")
            err.response = MockResponse()
            raise err from e
        raise

huggingface_hub.hf_hub_download = patched_hf_hub_download

print("Loading SpeechBrain model...")
from speechbrain.pretrained import SpeakerRecognition

try:
    model = SpeakerRecognition.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb",
        savedir="pretrained_models"
    )
    print("Model loaded successfully!")
except Exception as e:
    import traceback
    traceback.print_exc()
    sys.exit(1)
