#!/bin/bash
#SBATCH --job-name=gpu-job
#SBATCH --time=04:00:00
#SBATCH --nodes=1
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=8G
#SBATCH --gres=gpu:1

echo "GPU job $SLURM_JOB_ID starting"
echo "GPU: $CUDA_VISIBLE_DEVICES"

# Load CUDA module if available
module load cuda 2>/dev/null || echo "CUDA module not available"

# Your GPU code here
nvidia-smi
echo "GPU job completed"