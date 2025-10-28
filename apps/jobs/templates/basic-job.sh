#!/bin/bash
#SBATCH --job-name=basic-job
#SBATCH --time=01:00:00
#SBATCH --nodes=1
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=1G

echo "Hello from job $SLURM_JOB_ID"
echo "Running on node: $(hostname)"
echo "Start time: $(date)"
sleep 30
echo "End time: $(date)"