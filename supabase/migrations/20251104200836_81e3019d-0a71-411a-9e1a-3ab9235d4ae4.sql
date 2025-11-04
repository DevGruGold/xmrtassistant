-- Update executive_feedback table to remove "violation" language
ALTER TABLE public.executive_feedback 
  RENAME COLUMN issue_description TO observation_description;

-- Add new helpful columns
ALTER TABLE public.executive_feedback
  ADD COLUMN IF NOT EXISTS impact_level TEXT DEFAULT 'low' CHECK (impact_level IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS suggestion_type TEXT DEFAULT 'optimization' CHECK (suggestion_type IN ('optimization', 'alternative_approach', 'best_practice', 'learning_opportunity'));

-- Update existing feedback types to be more constructive
UPDATE public.executive_feedback 
SET feedback_type = 'optimization_suggestion' 
WHERE feedback_type = 'code_execution_violation';

UPDATE public.executive_feedback
SET feedback_type = 'learning_opportunity'
WHERE feedback_type = 'tool_call_error';

-- Add comment explaining the shift
COMMENT ON TABLE public.executive_feedback IS 'Stores constructive feedback and learning opportunities for AI executives. Focuses on continuous improvement rather than rule enforcement.';

COMMENT ON COLUMN public.executive_feedback.observation_description IS 'Description of the optimization opportunity or learning point observed by background systems';

COMMENT ON COLUMN public.executive_feedback.impact_level IS 'Severity of impact: low (minor optimization), medium (notable improvement), high (critical learning)';

COMMENT ON COLUMN public.executive_feedback.suggestion_type IS 'Type of suggestion: optimization (better approach), alternative_approach (different method), best_practice (recommended pattern), learning_opportunity (educational moment)';