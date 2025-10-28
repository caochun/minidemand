#!/bin/bash
#SBATCH --job-name=parallel-job
#SBATCH --time=02:00:00
#SBATCH --nodes=2
#SBATCH --ntasks-per-node=4
#SBATCH --cpus-per-task=2
#SBATCH --mem=4G

echo "Parallel job $SLURM_JOB_ID starting"
echo "Nodes: $SLURM_JOB_NUM_NODES"
echo "Tasks per node: $SLURM_NTASKS_PER_NODE"
echo "Total tasks: $SLURM_NTASKS"

# Your parallel processing code here
for i in $(seq 1 $SLURM_NTASKS); do
  echo "Task $i running on $(hostname)"
done

echo "Job completed"