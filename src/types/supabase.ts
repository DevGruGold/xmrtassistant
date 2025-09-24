export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      conversation_sessions: {
        Row: {
          id: string
          session_key: string
          title: string | null
          is_active: boolean | null
          created_at: string
          updated_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          session_key: string
          title?: string | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          session_key?: string
          title?: string | null
          is_active?: boolean | null
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
      }
      conversation_messages: {
        Row: {
          id: string
          session_id: string
          content: string
          message_type: string
          metadata: Json | null
          timestamp: string
          processing_data: Json | null
        }
        Insert: {
          id?: string
          session_id: string
          content: string
          message_type: string
          metadata?: Json | null
          timestamp?: string
          processing_data?: Json | null
        }
        Update: {
          id?: string
          session_id?: string
          content?: string
          message_type?: string
          metadata?: Json | null
          timestamp?: string
          processing_data?: Json | null
        }
      }
      conversation_summaries: {
        Row: {
          id: string
          session_id: string
          summary_text: string
          message_count: number
          start_message_id: string | null
          end_message_id: string | null
          created_at: string
          updated_at: string
          metadata: Json | null
        }
        Insert: {
          id?: string
          session_id: string
          summary_text: string
          message_count?: number
          start_message_id?: string | null
          end_message_id?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
        Update: {
          id?: string
          session_id?: string
          summary_text?: string
          message_count?: number
          start_message_id?: string | null
          end_message_id?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json | null
        }
      }
      tasks: {
        Row: {
          id: string
          session_key: string
          title: string
          description: string | null
          task_type: string
          status: string
          priority: number | null
          scheduled_for: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
          metadata: Json | null
          execution_data: Json | null
          parent_task_id: string | null
        }
        Insert: {
          id?: string
          session_key: string
          title: string
          description?: string | null
          task_type: string
          status?: string
          priority?: number | null
          scheduled_for?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          metadata?: Json | null
          execution_data?: Json | null
          parent_task_id?: string | null
        }
        Update: {
          id?: string
          session_key?: string
          title?: string
          description?: string | null
          task_type?: string
          status?: string
          priority?: number | null
          scheduled_for?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
          metadata?: Json | null
          execution_data?: Json | null
          parent_task_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}