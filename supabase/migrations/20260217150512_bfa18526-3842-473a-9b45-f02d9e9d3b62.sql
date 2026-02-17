
-- Create messages table for teacher-parent communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID NOT NULL REFERENCES public.institutions(id),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users view own messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    (sender_id = auth.uid() OR receiver_id = auth.uid())
    AND institution_id = get_user_institution_id(auth.uid())
  );

-- Users can send messages within their institution
CREATE POLICY "Users send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND institution_id = get_user_institution_id(auth.uid())
  );

-- Users can update their own received messages (mark as read)
CREATE POLICY "Users mark messages read"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid() AND institution_id = get_user_institution_id(auth.uid()));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
