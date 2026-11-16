"""
Training script for the Traffic Intersection RL Agent.

Uses Stable-Baselines3 PPO to train a policy on the simple 4-lane
intersection environment. The trained model is saved to rl_agent/models/.

Usage:
    python -m rl_agent.train                  # from project root
    python train.py                           # from rl_agent/
    python train.py --timesteps 200000        # custom timesteps
    python train.py --eval                    # run evaluation after training
"""

import argparse
import os
import sys
import numpy as np

# ---------------------------------------------------------------------------
# Ensure the rl_agent package is importable when running as `python train.py`
# ---------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.callbacks import (
    EvalCallback,
    StopTrainingOnRewardThreshold,
    CheckpointCallback,
)
from stable_baselines3.common.vec_env import VecNormalize
from stable_baselines3.common.monitor import Monitor

from rl_agent.enviornment.traffic_env import TrafficIntersectionEnv


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
MODEL_DIR = os.path.join(SCRIPT_DIR, "models")
LOG_DIR = os.path.join(SCRIPT_DIR, "logs")
BEST_MODEL_PATH = os.path.join(MODEL_DIR, "best_model")
FINAL_MODEL_PATH = os.path.join(MODEL_DIR, "traffic_ppo_final")
CHECKPOINT_DIR = os.path.join(MODEL_DIR, "checkpoints")
VECNORM_PATH = os.path.join(MODEL_DIR, "vec_normalize_stats.pkl")

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(LOG_DIR, exist_ok=True)
os.makedirs(CHECKPOINT_DIR, exist_ok=True)


def make_env(**kwargs):
    """Factory for creating a single TrafficIntersectionEnv."""
    def _init():
        return TrafficIntersectionEnv(**kwargs)
    return _init


def train(
    total_timesteps: int = 100_000,
    n_envs: int = 4,
    learning_rate: float = 3e-4,
    seed: int = 42,
    eval_freq: int = 5000,
    verbose: int = 1,
):
    """
    Train a PPO agent on the traffic intersection environment.

    Parameters
    ----------
    total_timesteps : int
        Total environment interactions for training.
    n_envs : int
        Number of parallel environments for data collection.
    learning_rate : float
        PPO learning rate.
    seed : int
        Random seed for reproducibility.
    eval_freq : int
        Evaluate the agent every `eval_freq` steps.
    verbose : int
        Verbosity level (0=silent, 1=info, 2=debug).
    """
    print("=" * 60)
    print("  IntelliRoute — Traffic RL Agent Training")
    print("=" * 60)
    print(f"  Timesteps     : {total_timesteps:,}")
    print(f"  Parallel Envs : {n_envs}")
    print(f"  Learning Rate : {learning_rate}")
    print(f"  Seed          : {seed}")
    print(f"  Eval Freq     : every {eval_freq:,} steps")
    print(f"  Model Dir     : {MODEL_DIR}")
    print("=" * 60)

    # ------------------------------------------------------------------
    # 1. Create vectorised training environments
    # ------------------------------------------------------------------
    env = make_vec_env(
        TrafficIntersectionEnv,
        n_envs=n_envs,
        seed=seed,
        monitor_dir=LOG_DIR,
    )
    # Normalise observations & rewards for stable training
    env = VecNormalize(env, norm_obs=True, norm_reward=True, clip_obs=10.0)

    # ------------------------------------------------------------------
    # 2. Create evaluation environment
    # ------------------------------------------------------------------
    eval_env = make_vec_env(
        TrafficIntersectionEnv,
        n_envs=1,
        seed=seed + 100,
    )
    eval_env = VecNormalize(eval_env, norm_obs=True, norm_reward=False, clip_obs=10.0)

    # ------------------------------------------------------------------
    # 3. Callbacks
    # ------------------------------------------------------------------
    # Save best model based on evaluation reward
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=MODEL_DIR,
        log_path=LOG_DIR,
        eval_freq=max(eval_freq // n_envs, 1),
        n_eval_episodes=10,
        deterministic=True,
        verbose=verbose,
    )

    # Save periodic checkpoints
    checkpoint_callback = CheckpointCallback(
        save_freq=max(10_000 // n_envs, 1),
        save_path=CHECKPOINT_DIR,
        name_prefix="traffic_ppo",
        verbose=0,
    )

    # ------------------------------------------------------------------
    # 4. Create and train the PPO agent
    # ------------------------------------------------------------------
    model = PPO(
        policy="MlpPolicy",
        env=env,
        learning_rate=learning_rate,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.01,          # Encourage exploration
        vf_coef=0.5,
        max_grad_norm=0.5,
        seed=seed,
        verbose=verbose,
        tensorboard_log=os.path.join(LOG_DIR, "tensorboard"),
    )

    print("\n🚦 Starting training...\n")
    model.learn(
        total_timesteps=total_timesteps,
        callback=[eval_callback, checkpoint_callback],
        progress_bar=True,
    )

    # ------------------------------------------------------------------
    # 5. Save final model & normalisation stats
    # ------------------------------------------------------------------
    model.save(FINAL_MODEL_PATH)
    env.save(VECNORM_PATH)
    print(f"\n✅ Final model saved to  : {FINAL_MODEL_PATH}.zip")
    print(f"✅ VecNormalize stats    : {VECNORM_PATH}")
    print(f"✅ Best model saved to   : {BEST_MODEL_PATH}.zip")

    env.close()
    eval_env.close()

    return model


def evaluate(model=None, n_episodes: int = 20, render: bool = True):
    """
    Evaluate a trained model (or load the best saved one).

    Parameters
    ----------
    model : PPO or None
        If None, loads the best saved model from disk.
    n_episodes : int
        Number of evaluation episodes to run.
    render : bool
        Whether to print the environment state each step.
    """
    print("\n" + "=" * 60)
    print("  Evaluation")
    print("=" * 60)

    if model is None:
        model_path = BEST_MODEL_PATH + ".zip"
        if not os.path.exists(model_path):
            model_path = FINAL_MODEL_PATH + ".zip"
        print(f"  Loading model from: {model_path}")
        model = PPO.load(model_path)

    env = TrafficIntersectionEnv(render_mode="human" if render else None)

    episode_rewards = []
    episode_lengths = []
    action_counts = np.zeros(4, dtype=int)

    for ep in range(n_episodes):
        obs, info = env.reset()
        total_reward = 0.0
        steps = 0
        done = False

        while not done:
            action, _ = model.predict(obs, deterministic=True)
            action = int(action)
            action_counts[action] += 1
            obs, reward, terminated, truncated, info = env.step(action)
            total_reward += reward
            steps += 1
            done = terminated or truncated

            if render and ep == 0:  # Render only first episode
                env.render()

        episode_rewards.append(total_reward)
        episode_lengths.append(steps)

    env.close()

    print(f"\n📊 Results over {n_episodes} episodes:")
    print(f"   Mean Reward  : {np.mean(episode_rewards):.1f} ± {np.std(episode_rewards):.1f}")
    print(f"   Mean Length  : {np.mean(episode_lengths):.0f}")
    print(f"   Action Distribution:")
    lane_names = ["North", "East", "South", "West"]
    total_actions = action_counts.sum()
    for i, name in enumerate(lane_names):
        pct = 100 * action_counts[i] / total_actions if total_actions > 0 else 0
        print(f"     {name:>5}: {action_counts[i]:>5} ({pct:.1f}%)")


def main():
    parser = argparse.ArgumentParser(
        description="Train a PPO agent for traffic signal control"
    )
    parser.add_argument(
        "--timesteps", type=int, default=100_000,
        help="Total training timesteps (default: 100,000)",
    )
    parser.add_argument(
        "--envs", type=int, default=4,
        help="Number of parallel training environments (default: 4)",
    )
    parser.add_argument(
        "--lr", type=float, default=3e-4,
        help="Learning rate (default: 3e-4)",
    )
    parser.add_argument(
        "--seed", type=int, default=42,
        help="Random seed (default: 42)",
    )
    parser.add_argument(
        "--eval", action="store_true",
        help="Run evaluation after training",
    )
    parser.add_argument(
        "--eval-only", action="store_true",
        help="Skip training, only evaluate existing model",
    )
    parser.add_argument(
        "--no-render", action="store_true",
        help="Disable rendering during evaluation",
    )

    args = parser.parse_args()

    if args.eval_only:
        evaluate(n_episodes=20, render=not args.no_render)
    else:
        trained_model = train(
            total_timesteps=args.timesteps,
            n_envs=args.envs,
            learning_rate=args.lr,
            seed=args.seed,
        )
        if args.eval:
            evaluate(model=trained_model, n_episodes=20, render=not args.no_render)

    print("\n🎉 Done!")


if __name__ == "__main__":
    main()
