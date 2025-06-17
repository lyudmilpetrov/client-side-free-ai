# Below is a straightforward outline for hosting the project on GitHub Pages. Each step assumes you already have the repository pushed to GitHub.

## Create a production build
    From the project directory, run:

    npm install          # install dependencies
    npm run build        # produces the static files under the "dist" directory
    Push the build artifacts to a “gh-pages” branch

## Create a branch named gh-pages (if it doesn’t exist).
    # create a new orphan branch locally
    git checkout --orphan gh-pages
    git push -u origin gh-pages   # this command creates the branch on GitHub
## Copy the contents of the dist folder to the root of that branch.

Commit and push the branch:

git checkout --orphan gh-pages
git reset --hard
cp -r dist/* .
git add .
git commit -m "Publish to GitHub Pages"
git push origin gh-pages
Configure the Pages settings on GitHub

In your repository’s “Settings” → “Pages,” select the gh-pages branch.

Choose / (root) as the folder. Save the configuration.

Visit the generated URL
GitHub will build and serve your static site. After a minute or two, the Pages section in Settings will show your site’s URL (usually https://<username>.github.io/<repository>). Open that address in a browser to confirm the site loads.

These steps publish your built React/Vite application as a static page using GitHub Pages. If your repository has a custom domain defined in docs/CNAME, you can move that file into the branch as well.