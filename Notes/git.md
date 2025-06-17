# Below is a straightforward outline for hosting the project on GitHub Pages. Each step assumes you already have the repository pushed to GitHub.

## Create a production build
    From the project directory, run:

    npm install          # install dependencies
    npm run build        # produces the static files under the "dist" directory
    Push the build artifacts to a “gh-pages” branch

## Create a branch named gh-pages (if it doesn’t exist).

    Commit and push the branch:

    git checkout --orphan gh-pages
    git reset --hard
    cp -r dist/* .
    git add .
    git commit -m "Publish to GitHub Pages"
    git push origin gh-pages

## Configure the Pages settings on GitHub

    In your repository’s “Settings” → “Pages,” select the gh-pages branch.

    Choose / (root) as the folder. Save the configuration.

    Visit the generated URL
    GitHub will build and serve your static site. After a minute or two, the Pages section in Settings will show your site’s URL (usually https://<username>.github.io/<repository>). Open that address in a browser to confirm the site loads.

    These steps publish your built React/Vite application as a static page using GitHub Pages. If your repository has a custom domain defined in docs/CNAME, you can move that file into the branch as well.



To update the main branch on your remote with the contents of your local gh-pages branch, you can push directly:

git push origin gh-pages:main
This sends your local gh-pages branch to the remote branch named main. If you want the histories merged locally before pushing, you would instead:

git checkout main
git merge gh-pages
git merge gh-pages --allow-unrelated-histories
git push origin main



Answer:

After you commit code on main, build the project and update the gh‑pages branch with the generated files. The repository’s Notes/git.md describes the publish workflow:

git checkout --orphan gh-pages
git reset --hard
cp -r dist/* .
git add .
git commit -m "Publish to GitHub Pages"
git push origin gh-pages

To keep gh-pages current:

On main, run npm run build.
(The build artifacts go into dist/.)

Checkout the gh-pages branch:

git checkout gh-pages
Replace its contents with the freshly built files:

git rm -r .
cp -r ../dist/* .
Commit and push:

git add .
git commit -m "Update GitHub Pages"
git push origin gh-pages
Switch back to main for further development:

git checkout main
Once pushed, GitHub Pages will serve the updated site from the gh-pages branch.

### Configure Vite base path

When deploying to GitHub Pages under a repository name (e.g. `https://<user>.github.io/client-side-free-ai/`), set the `base` option in `vite.config.js`:

```js
export default defineConfig({
  plugins: [plugin()],
  base: '/client-side-free-ai/',
});
```

Rebuild after changing this setting so asset URLs include the repository subpath.



# Switch to the target branch
git checkout gh-pages --force

# Ensure the latest changes are pulled (optional)
git pull origin gh-pages

# Copy the folder from the source branch
git checkout main -- dist

# Add and commit the changes
git add dist
git commit -m "Copied folder from main to gh-pages"

# Push the changes (if needed)
git push origin gh-pages
