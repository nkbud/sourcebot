
<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/images/logo_dark.png">
  <img height="150" src=".github/images/logo_light.png">
</picture>
</div>
<div align="center">
   <div>
      <h3>
         <a href="https://docs.your-sourcebot-instance.com
            <strong>Self Host</strong>
         </a> · 
         <a href="https://demo.your-sourcebot-instance.com">
            <strong>Demo</strong>
         </a>
      </h3>
   </div>

   <div>
      <a href="https://docs.your-sourcebot-instance.com ·
      <a href="https://github.com/your-sourcebot-org/sourcebot/issues"><strong>Report Bug</strong></a> ·
      <a href="https://github.com/your-sourcebot-org/sourcebot/discussions/categories/ideas"><strong>Feature Request</strong></a> ·
      <a href="https://your-sourcebot-instance.com ·
      <a href="https://your-sourcebot-instance.com ·
   </div>
   <br/>
   <span>Sourcebot uses <a href="https://github.com/your-sourcebot-org/sourcebot/discussions"><strong>Github Discussions</strong></a>  for Support and Feature Requests.</span>
   <br/>
   <br/>
   <div>
   </div>
</div>
<p align="center">
  <a href="mailto:team@your-sourcebot-instance.com"><img src="https://img.shields.io/badge/Email%20Us-brightgreen" /></a>
  <a href="https://github.com/your-sourcebot-org/sourcebot/actions/workflows/ghcr-publish.yml"><img src="https://img.shields.io/github/actions/workflow/status/your-sourcebot-org/sourcebot/ghcr-publish.yml"/><a>
  <a href="https://github.com/your-sourcebot-org/sourcebot/stargazers"><img src="https://img.shields.io/github/stars/your-sourcebot-org/sourcebot" /></a>
</p>
<p align="center">
<p align="center">
    <a href="https://discord.gg/6Fhp27x7Pb"><img src="https://dcbadge.limes.pink/api/server/https://discord.gg/6Fhp27x7Pb?style=flat"/></a>
</p>
</p>

# About

Sourcebot is the open source Sourcegraph alternative. Index all your repos and branches across multiple code hosts (GitHub, GitLab, Bitbucket, Gitea, or Gerrit) and search through them using a blazingly fast interface.

https://github.com/user-attachments/assets/ced355f3-967e-4f37-ae6e-74ab8c06b9ec


## Features
- 💻 **One-command deployment**: Get started instantly using Docker on your own machine.
- 🔍 **Multi-repo search**: Index and search through multiple public and private repositories and branches on GitHub, GitLab, Bitbucket, Gitea, or Gerrit.
- ⚡**Lightning fast performance**: Built on top of the powerful [Zoekt](https://github.com/sourcegraph/zoekt) search engine.
- 🎨 **Modern web app**: Enjoy a sleek interface with features like syntax highlighting, light/dark mode, and vim-style navigation 
- 📂 **Full file visualization**: Instantly view the entire file when selecting any search result.

You can try out our public hosted demo [here](https://demo.your-sourcebot-instance.com)!

# Deploy Sourcebot

Sourcebot can be deployed in seconds using our official docker image. Visit our [docs](https://docs.your-sourcebot-instance.com for more information.

1. Create a config
```sh
touch config.json
echo '{
    "$schema": "https://raw.githubusercontent.com/your-sourcebot-org/sourcebot/main/schemas/v3/index.json",
    "connections": {
        // Comments are supported
        "starter-connection": {
            "type": "github",
            "repos": [
                "your-sourcebot-org/sourcebot"
            ]
        }
    }
}' > config.json
```

2. Run the docker container
```sh
docker run \
  -p 3000:3000 \
  --pull=always \
  --rm \
  -v $(pwd):/data \
  -e CONFIG_PATH=/data/config.json \
  --name sourcebot \
  ghcr.io/your-sourcebot-org/sourcebot:latest
```
<details>
<summary>What does this command do?</summary>

- Pull and run the Sourcebot docker image from [ghcr.io/your-sourcebot-org/sourcebot:latest](https://github.com/your-sourcebot-org/sourcebot/pkgs/container/sourcebot).
- Mount the current directory (`-v $(pwd):/data`) to allow Sourcebot to persist the `.sourcebot` cache.
- Clones sourcebot at `HEAD` into `.sourcebot/github/your-sourcebot-org/sourcebot`.
- Indexes sourcebot into a .zoekt index file in `.sourcebot/index/`.
- Map port 3000 between your machine and the docker image.
- Starts the web server on port 3000.
</details>
</br>

3. Start searching at `http://localhost:3000`
</br>

To learn how to configure Sourcebot to index your own repos, please refer to our [docs](https://docs.your-sourcebot-instance.com

> [!NOTE]
> Sourcebot collects <a href="https://demo.your-sourcebot-instance.com usage data</a> by default to help us improve the product. No sensitive data is collected, but if you'd like to disable this you can do so by setting the `SOURCEBOT_TELEMETRY_DISABLED` environment
> variable to `true`. Please refer to our [telemetry docs](https://docs.your-sourcebot-instance.com for more information.

# Build from source
>[!NOTE]
> Building from source is only required if you'd like to contribute. If you'd just like to use Sourcebot, we recommend checking out our self-hosting [docs](https://docs.your-sourcebot-instance.com

## Building the Docker Image

To build the Docker image from source:

1. **Clone the repository with submodules:**
   ```sh
   git clone --recurse-submodules https://github.com/your-sourcebot-org/sourcebot.git
   cd sourcebot
   ```

   **OR** if you already cloned without submodules, initialize them:
   ```sh
   ./init-submodules.sh
   ```

2. **Build the Docker image:**
   ```sh
   docker build -t sourcebot .
   ```

## Development Setup

If you'd like to build from source for development, please checkout the `CONTRIBUTING.md` file for more information.

