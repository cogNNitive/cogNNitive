# Proposal: Onboarding Bootstrap Flow & AI Agent Installation Guide

## Context & Motivation

cogNNitive Modeler operates on local folders containing semantic knowledge model files (`*_NN.md`). For new users and existing users creating fresh workspaces, the initial onboarding journey had ambiguity:
1. Opening an empty directory resulted in a generic "No iNNfo models found" warning rather than guiding the user to bootstrap the workspace.
2. Users were not given explicit conventions for local folder naming (recommending `~/Documents/<name>_NN`).
3. Users were not informed upfront that bootstrapping a workspace is performed by an external local AI agent (OpenCode, Claude Code, Antigravity, Codex) and that having an AI agent installed on their computer is a prerequisite.

## Proposed Solution

1. **Home Dual Card Layout:**
   - **Card 1: Create New Workspace (`_NN` + AI Agent Bootstrap)**
     - Explains folder creation (e.g. `~/Documents/my-project_NN`).
     - Prerequisite notice with a direct link opening the new *Installing AI Agents* documentation in a new tab.
     - Direct action button to select/open the folder for bootstrapping.
   - **Card 2: Open Existing Workspace**
     - Primary action to open an existing workspace folder.
     - Visual micro-guide contrasting containing folder selection vs individual files.
     - Quick link to *Recent Workspaces*.

2. **Contextual Bootstrap Modal:**
   - When an empty folder is selected (or when creating a new workspace), the application displays a 3-step Bootstrapping Modal:
     - **Step 1:** Open your AI agent / terminal in the directory (`cd <folder-path>`).
     - **Step 2:** Copy the 1-click bootstrap prompt (`innfo: bootstrap a new workspace model in this directory`).
     - **Step 3:** Auto-detect & Load button with interval polling (detects as soon as the agent writes the first `*_NN.md` file and transitions into the editor).

3. **Installing AI Agents Documentation (`installing-ai-agents.md`):**
   - Complete guide covering local AI agent concepts, system permissions, and installation steps for:
     - **OpenCode** (Strongly Recommended)
     - **Claude Code**
     - **Google Antigravity**
     - **Codex**
