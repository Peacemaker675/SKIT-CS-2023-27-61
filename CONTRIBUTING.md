# Contributing to Intelliroute

Please follow these guidelines.

---

## 1. Getting Started

### Prerequisites
* **Docker & Docker Compose**
* **Python 3.12**
* **Node.js & npm/pnpm**

### Local Setup
1. Clone the repository:
	```
	git clone https://github.com/Peacemaker675/Intelliroute
	cd smart-traffic-system
	```
2. Copy the enviornment configuration
	```
	cp .env.example .env
	```
3. Spin up the multi container stack locally
	```
	docker compose up --build
	```

## 2. Directory Architecture & Branch Policy

### Micro-service Boundaries

Keep logic isolated within its service directory. Inter-service schemas and configuration files must reside in /shared.

    /frontend - UI Dashboard (React / Next.js)

    /backend - Core API Gateway & Database Interfaces

    /vision - Video processing, object detection, and queue density estimation

    /rl_agent - Gymnasium environments, SUMO integration, and PPO inference logic

    /shared - Cross-service schemas, contract definitions, and map configs

### Branch Naming Conventions

Always branch off main:

    feat/<service>-<short-description> (e.g., feat/vision-yolov8-tracking)

    fix/<service>-<short-description> (e.g., fix/backend-websocket-reconnect)

    docs/<description> (e.g., docs/update-api-routes)

## 3. Pre-Commit Hooks & Linting

We enforce automatic formatting and linting on every commit via `pre-commit`.

1. Install pre-commit:
	```
	pip install pre-commit
	```
2. Activate git hooks:
    ```
    pre-commit install
	```
3. Run manually against all files:
	```
    pre-commit run --all-files
	```

## 4. Pull Request Workflow

* Ensure pre-commit hooks pass locally.
* Push your branch and open a PR against main.

## 5. Model Weights & Data Handling

* Do NOT commit model weights or test video streams to Git.
* Place .pt, .onnx, .pkl, and .mp4 files inside ignored directories (vision/models/, rl_agent/models/, vision/data/).
