import React from 'react';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';

const DISPLAY_STAGES = [
  'Requested', 'Driver Assigned', 'Pickup In Progress', 'Arrived at HUB',
  'QA Inspection', 'Accepted', 'Sorting', 'Baling',
  'Stored in Inventory', 'Reserved by Industry', 'Outbound Delivery', 'Completed'
];

export default function StageTracker({ currentStage, compact = false }) {
  const stages = compact ? DISPLAY_STAGES.filter((_, i) => i % 2 === 0 || DISPLAY_STAGES[i] === currentStage) : DISPLAY_STAGES;
  const currentIdx = DISPLAY_STAGES.indexOf(currentStage);
  const isRejected = currentStage === 'Rejected';

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {stages.map((stage, i) => {
          const realIdx = DISPLAY_STAGES.indexOf(stage);
          const isDone = realIdx < currentIdx;
          const isCurrent = stage === currentStage;
          return (
            <React.Fragment key={stage}>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${
                isDone ? 'bg-green-100 text-green-700' :
                isCurrent ? 'bg-primary/10 text-primary ring-1 ring-primary/30' :
                'bg-muted text-muted-foreground'
              }`}>
                {isDone ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                {stage}
              </div>
              {i < stages.length - 1 && <ArrowRight className="w-3 h-3 text-muted-text shrink-0" />}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center min-w-max gap-0">
        {DISPLAY_STAGES.map((stage, i) => {
          const isDone = i < currentIdx;
          const isCurrent = stage === currentStage;
          return (
            <React.Fragment key={stage}>
              <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isRejected && stage === 'Accepted' ? 'bg-destructive/10 text-destructive ring-2 ring-destructive/30' :
                  isDone ? 'bg-green-500 text-white' :
                  isCurrent ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] text-center leading-tight max-w-[70px] ${
                  isCurrent ? 'font-semibold text-primary' :
                  isDone ? 'text-green-600 font-medium' :
                  'text-muted-foreground'
                }`}>{isRejected && stage === 'Accepted' ? 'Rejected' : stage}</span>
              </div>
              {i < DISPLAY_STAGES.length - 1 && (
                <div className={`h-0.5 w-6 shrink-0 ${i < currentIdx ? 'bg-green-400' : 'bg-border'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}