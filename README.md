# Daily-Necessities
A dashboard that allows the purchase of daily necessities

# Project title


# Features
- A landing page
- Cart
- Shipping(!In Review!)
- Orders
- Reviews
- Contact Us
- Top Sellers
- Product Sorting(or) Filtering
- Discounts and Sale

# Categories
- Veggies
- Groceries
- Dairy Products
- Cosmetics
- Sanitary
- Beverages
- MedPharm

# About Project
 _Daily-Necessities is a web-based e-commerce dashboard designed to simplify the procurement of household essentials. From fresh produce to wellness products, the platform provides a streamlined user interface  for browsing, sorting, and purchasing daily needs._
 
 **Software Process Model:-** Incremental (or) AGILE Software Process Model
 
 **Languages Used:-** HTML5, CSS3 , Javascript

# Tools and Software Used
- Git Tools
- Git Hub Repository
- VS Code

# Roles
- Frontend Developer : Sathya Sai S
- Backend Developer : Charan Nihaal R
- GIT Manager : Dhanush P

# Deploy on GitHub Pages (GitHub Actions)

This repository now includes a workflow file at `.github/workflows/deploy-pages.yml` that deploys the complete static project to GitHub Pages.

## Step-by-step setup

1. **Push the new workflow to your repository**
	- Make sure `.github/workflows/deploy-pages.yml` is committed and pushed.

2. **Open your repository settings**
	- Go to: **GitHub Repository → Settings → Pages**.

3. **Set Pages source to GitHub Actions**
	- Under **Build and deployment**, choose:
	  - **Source**: `GitHub Actions`

4. **Check your default branch**
	- The workflow currently deploys when you push to:
	  - `main`, `master`, or `charan-sathya`
	- If your active branch is different, add it in `.github/workflows/deploy-pages.yml` under `on.push.branches`.

5. **Trigger deployment**
	- Push a commit to one of those branches **or**
	- Open **Actions → Deploy Daily Necessities to GitHub Pages → Run workflow**.

6. **Wait for the workflow to complete**
	- In the **Actions** tab, ensure both jobs succeed:
	  - `build`
	  - `deploy`

7. **Open your live website**
	- After a successful run, GitHub will publish to:
	- `https://<your-username>.github.io/<repository-name>/`

## Notes

- This project is deployed as a static site (HTML/CSS/JS), so no build tool is required.
- `index.html` in the repo root is used as the entry page.
- Supabase is client-side configured in `source/config.js`. Make sure URL and anon key are valid for production.

