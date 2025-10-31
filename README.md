# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Preset Configuration
1) Install ollama from https://ollama.com/download

# Install pip into your Python if it isn’t already
python -m ensurepip --upgrade

# Then upgrade pip itself and install huggingface-hub
python -m pip install --upgrade pip
python -m pip install huggingface-hub
pip install huggingface-hub

run the file get_from_hugging.py to get the weights for the model you want to use. For example, to get the weights for Qwen-0.6B, run:

```bash

2) Quantize & prepare your model artifacts
winget install --id=Python.Python.3
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp
python3 convert-pth-to-gguf.py --input /path/to/qwen-0.6b.pt --output /path/to/qwen-0.6b.gguf


## Project Goals
A minimal React frontend that loads and runs a “gpt-4o-mini” model entirely in the browser
In order to simplify loading and running the .wasm, we’re going to use a small helper library that wraps the low‐level WebAssembly APIs. In many published examples, people use a tiny wrapper like @openai/wasm‐runtime (hypothetical) or @xenova/transformers. In this guide, we’ll sketch out a minimal “wasm‐loader.js” ourselves so you can see exactly what’s happening—no black‐box dependency. If you do prefer an existing npm package (e.g. npm install @xenova/transformers), you can replace steps 3.4–3.5 with that library’s API.
## 1) buffer is a small polyfill so that Node‐style Buffer usage in some WebAssembly glue code still works in the browser.
```bash
npm install buffer
npm install @xenova/transformers
## 2) Create src/wasm‐loader.js
2. Verify WebGPU support
In src/index.js (or at the top of your entrypoint), add:

js
Copy
Edit
if (!navigator.gpu) {
  console.error('⚠️ WebGPU not supported in this browser.');
  // You might show a fallback message/UI here.
}

3. Create your WebGPU loader


curl -L https://huggingface.co/Qwen/Qwen3-0.6B-Base/resolve/main/vocab.json -o public/models/qwen-0.6b/vocab.json


1. Install WebLLM
## Deploying to GitHub Pages
1. Run `npm run build` to create the `dist` directory.
2. Copy the contents of `dist` to your `gh-pages` branch.
3. Push `gh-pages` and enable Pages in the repository settings.

The Vite config sets `base: "/client-side-free-ai/"` so asset URLs resolve correctly.

# 1. Navigate to your repo root
cd /path/to/your/repo

# 2. Use subtree push (recommended for simplicity)
The project already configures Vite with `base: "/client-side-free-ai/"`, so the
bundled assets load correctly when served from the `https://<user>.github.io/client-side-free-ai/`
path. Follow the steps below to publish the built site to GitHub Pages.

### 1. Prepare your repository

1. Commit any outstanding changes on your main branch.
2. Ensure the project installs cleanly by running `npm install`.
3. Optionally run `npm test` or any other checks you rely on before publishing.

### 2. Build the production bundle

1. From the project root run `npm run build`.
2. Confirm that a fresh `dist/` directory has been generated; this folder contains
   the static files that must be published.

### 3. Publish the `dist/` folder to a `gh-pages` branch

Run the commands below from the project root to create (or update) the Pages branch
with the latest build artifacts:

```bash
git subtree split --prefix dist -b gh-pages-deploy
git push origin gh-pages-deploy:gh-pages --force
git branch -D gh-pages-deploy
```

Alternatively, manage the branch with a worktree so you can copy files directly:

```bash
git worktree add ../client-side-free-ai-gh-pages gh-pages
rsync -av --delete dist/ ../client-side-free-ai-gh-pages/
cd ../client-side-free-ai-gh-pages
git add .
git commit -m "Deploy latest build"
git push origin gh-pages
cd -
git worktree remove ../client-side-free-ai-gh-pages
```

> The `rsync` command keeps the branch in sync with the contents of `dist/`. You can
> replace it with manual file copies if you prefer.

### 4. Enable GitHub Pages

1. Open the repository on GitHub and navigate to **Settings → Pages**.
2. Under **Source**, choose **Deploy from a branch**.
3. Select the `gh-pages` branch and the `/ (root)` folder, then click **Save**.
4. Wait for GitHub to deploy the site. The published URL will be displayed on the
   Pages settings screen once the deployment completes.

After the first deployment, repeat steps 2 and 3 whenever you want to publish a new
build.