"use client";

import { cn } from "@/lib/utils";
import { Check, Lock, Circle } from "lucide-react";

export interface WorkflowStep {
  id: 1 | 2 | 3 | 4 | 5;
  label: string;
  sublabel: string;
  status: "completed" | "active" | "pending" | "blocked";
}

export interface WorkflowStepperProps {
  steps: WorkflowStep[];
  activeStep: number;
  onStepClick: (stepId: number) => void;
}

const STEP_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "01",
  2: "02",
  3: "03",
  4: "04",
  5: "05",
};

function StepIcon({
  step,
  size = "md",
}: {
  step: WorkflowStep;
  size?: "sm" | "md";
}) {
  const base = size === "md" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";

  if (step.status === "completed") {
    return (
      <span
        className={cn(
          "flex items-center justify-center rounded-full font-semibold",
          base,
          "bg-green-600 text-white"
        )}
      >
        <Check className={size === "md" ? "h-5 w-5" : "h-4 w-4"} strokeWidth={2.5} />
      </span>
    );
  }

  if (step.status === "active") {
    return (
      <span
        className={cn(
          "flex items-center justify-center rounded-full font-bold ring-4 ring-primary/20",
          base,
          "bg-primary text-primary-foreground"
        )}
      >
        {STEP_LABELS[step.id]}
      </span>
    );
  }

  if (step.status === "blocked") {
    return (
      <span
        className={cn(
          "flex items-center justify-center rounded-full font-semibold",
          base,
          "bg-red-100 text-red-500 border-2 border-red-300"
        )}
      >
        <Lock className={size === "md" ? "h-4 w-4" : "h-3 w-3"} />
      </span>
    );
  }

  // pending
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full font-semibold border-2",
        base,
        "border-muted-foreground/30 bg-background text-muted-foreground/60"
      )}
    >
      {STEP_LABELS[step.id]}
    </span>
  );
}

function ConnectorLine({ leftStatus, rightStatus }: { leftStatus: WorkflowStep["status"]; rightStatus: WorkflowStep["status"] }) {
  const filled = leftStatus === "completed";
  return (
    <div className="flex-1 mx-1 mt-5 h-0.5 shrink" aria-hidden>
      <div
        className={cn(
          "h-full w-full rounded-full transition-colors duration-300",
          filled ? "bg-green-400" : "bg-muted-foreground/20"
        )}
      />
    </div>
  );
}

export function WorkflowStepper({ steps, activeStep, onStepClick }: WorkflowStepperProps) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-start min-w-[480px] px-1">
        {steps.map((step, index) => {
          const isClickable = step.status !== "blocked" && step.status !== "pending";
          const next = steps[index + 1];

          return (
            <div key={step.id} className="flex items-start flex-1 min-w-0">
              {/* Step node */}
              <button
                type="button"
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                aria-current={step.status === "active" ? "step" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1.5 flex-shrink-0 w-24 transition-opacity",
                  isClickable
                    ? "cursor-pointer hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
                    : "cursor-default opacity-60"
                )}
              >
                <StepIcon step={step} />

                <div className="text-center space-y-0.5 px-1">
                  <p
                    className={cn(
                      "text-xs font-semibold leading-tight",
                      step.status === "active"
                        ? "text-primary"
                        : step.status === "completed"
                        ? "text-green-700"
                        : step.status === "blocked"
                        ? "text-red-500"
                        : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] leading-tight text-muted-foreground/70 whitespace-nowrap overflow-hidden text-ellipsis max-w-[88px]">
                    {step.sublabel}
                  </p>
                </div>
              </button>

              {/* Connector between steps */}
              {next && (
                <ConnectorLine leftStatus={step.status} rightStatus={next.status} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
