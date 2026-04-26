import argparse
import json
import threading
import time
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-id", required=True)
    parser.add_argument("--model-id", required=True)
    parser.add_argument("--log-file")
    args = parser.parse_args()

    stop_logging = threading.Event()

    def write_log(message: str) -> None:
        if not args.log_file:
            return
        log_path = Path(args.log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with log_path.open("a", encoding="utf-8") as handle:
            handle.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} {message}\n")

    def cache_size_logger() -> None:
        if not args.log_file:
            return
        cache_name = f"models--{args.repo_id.replace('/', '--')}"
        candidates = [
            Path.home() / ".cache" / "huggingface" / "hub" / cache_name,
        ]
        while not stop_logging.wait(30):
            for root in candidates:
                if not root.exists():
                    continue
                total = 0
                files = 0
                incomplete = 0
                for child in root.rglob("*"):
                    if child.is_file():
                        files += 1
                        total += child.stat().st_size
                        if child.name.endswith(".incomplete"):
                            incomplete += 1
                write_log(f"progress repo={args.repo_id} files={files} gib={total / 1024 / 1024 / 1024:.2f} incomplete={incomplete}")
                break

    logger_thread = threading.Thread(target=cache_size_logger, daemon=True)
    logger_thread.start()
    write_log(f"start repo={args.repo_id} model_id={args.model_id}")

    try:
        from huggingface_hub import snapshot_download
    except Exception as exc:
        print(
            json.dumps(
                {
                    "error": (
                        "Python dependency missing: install huggingface_hub, or install "
                        "transformers/diffusers which include it."
                    ),
                    "details": str(exc),
                }
            ),
            file=sys.stderr,
        )
        return 2

    allow_patterns = None
    if args.model_id == "sdxl-base-1.0":
        allow_patterns = [
            "model_index.json",
            "scheduler/*",
            "tokenizer/*",
            "tokenizer_2/*",
            "text_encoder/config.json",
            "text_encoder/model.safetensors",
            "text_encoder_2/config.json",
            "text_encoder_2/model.safetensors",
            "unet/config.json",
            "unet/diffusion_pytorch_model.safetensors",
            "vae/config.json",
            "vae/diffusion_pytorch_model.safetensors",
        ]

    try:
        local_path = snapshot_download(repo_id=args.repo_id, allow_patterns=allow_patterns)
    except Exception as exc:
        stop_logging.set()
        write_log(f"error repo={args.repo_id} details={exc}")
        print(json.dumps({"error": "Model download failed.", "details": str(exc)}), file=sys.stderr)
        return 1
    finally:
        stop_logging.set()

    write_log(f"complete repo={args.repo_id} path={local_path}")
    print(
        json.dumps(
            {
                "status": "installed",
                "modelId": args.model_id,
                "repoId": args.repo_id,
                "path": local_path,
                "message": f"{args.repo_id} is available in the local Hugging Face cache.",
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
