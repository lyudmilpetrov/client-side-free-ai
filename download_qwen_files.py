from huggingface_hub import hf_hub_download

# 1) Download the quantized GGUF weights:
gguf_path = hf_hub_download(
    repo_id="Qwen/Qwen3-0.6B-GGUF",
    filename="Qwen3-0.6B-Q8_0.gguf",
    repo_type="model",
    cache_dir="public/models/qwen-0.6b"
)
print("Saved weights to", gguf_path)

# 2) Download the tokenizer from the base model repo:
tokenizer_json = hf_hub_download(
    repo_id="Qwen/Qwen3-0.6B-Base",
    filename="tokenizer.json",
    repo_type="model",
    cache_dir="public/models/qwen-0.6b"
)
print("Saved tokenizer to", tokenizer_json)

# (Optionally, also grab merges.txt / vocab.json if your loader needs them:)
merges_txt = hf_hub_download(
    repo_id="Qwen/Qwen3-0.6B-Base",
    filename="merges.txt",
    repo_type="model",
    cache_dir="public/models/qwen-0.6b"
)
