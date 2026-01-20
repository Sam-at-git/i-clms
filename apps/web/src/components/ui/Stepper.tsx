import { ReactNode } from 'react';

interface Step {
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div style={styles.container}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={index} style={styles.step}>
            <div style={styles.stepHeader}>
              <div
                style={{
                  ...styles.stepNumber,
                  ...(isCompleted && styles.stepNumberCompleted),
                  ...(isCurrent && styles.stepNumberCurrent),
                }}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  style={{
                    ...styles.stepLine,
                    ...(isCompleted && styles.stepLineCompleted),
                  }}
                />
              )}
            </div>
            <div style={styles.stepContent}>
              <div
                style={{
                  ...styles.stepLabel,
                  ...(isCurrent && styles.stepLabelCurrent),
                }}
              >
                {step.label}
              </div>
              {step.description && (
                <div style={styles.stepDescription}>{step.description}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
  },
  step: {
    flex: 1,
    display: 'flex',
    gap: '12px',
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
  },
  stepNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    flexShrink: 0,
  },
  stepNumberCompleted: {
    backgroundColor: '#16a34a',
    color: '#fff',
  },
  stepNumberCurrent: {
    backgroundColor: '#1e3a5f',
    color: '#fff',
  },
  stepLine: {
    flex: 1,
    height: '2px',
    backgroundColor: '#e5e7eb',
  },
  stepLineCompleted: {
    backgroundColor: '#16a34a',
  },
  stepContent: {
    flex: 1,
  },
  stepLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    marginBottom: '4px',
  },
  stepLabelCurrent: {
    color: '#1e3a5f',
  },
  stepDescription: {
    fontSize: '12px',
    color: '#9ca3af',
  },
};

export default Stepper;
