
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "invitations": {
                  Row: {
                    "code_hash": string,"created_at": string,"expires_at": string,"id": string,"redeemed_at": string | null,"redeemed_by": string | null,"revoked_at": string | null,"role": Database["public"]['Enums']["app_role"],"student_id": string | null,"teacher_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code_hash": string,"created_at"?: string,"expires_at": string,"id"?: string,"redeemed_at"?: string | null,"redeemed_by"?: string | null,"revoked_at"?: string | null,"role": Database["public"]['Enums']["app_role"],"student_id"?: string | null,"teacher_id": string
                  }
                  Update: {
                    "code_hash"?: string,"created_at"?: string,"expires_at"?: string,"id"?: string,"redeemed_at"?: string | null,"redeemed_by"?: string | null,"revoked_at"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"student_id"?: string | null,"teacher_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitations_redeemed_by_fkey"
      columns: ["redeemed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_participants": {
                  Row: {
                    "attendance": Database["public"]['Enums']["attendance_status"],"lesson_id": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attendance"?: Database["public"]['Enums']["attendance_status"],"lesson_id": string,"student_id": string
                  }
                  Update: {
                    "attendance"?: Database["public"]['Enums']["attendance_status"],"lesson_id"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_participants_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_participants_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_series": {
                  Row: {
                    "created_at": string,"duration_min": number,"end_date": string | null,"format": Database["public"]['Enums']["lesson_format"],"frequency": Database["public"]['Enums']["series_frequency"],"id": string,"level": Database["public"]['Enums']["cefr_level"] | null,"local_start_time": string,"location": string | null,"materialized_until": string | null,"meeting_url": string | null,"start_date": string,"teacher_id": string,"timezone": string,"title": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"duration_min": number,"end_date"?: string | null,"format"?: Database["public"]['Enums']["lesson_format"],"frequency": Database["public"]['Enums']["series_frequency"],"id"?: string,"level"?: Database["public"]['Enums']["cefr_level"] | null,"local_start_time": string,"location"?: string | null,"materialized_until"?: string | null,"meeting_url"?: string | null,"start_date": string,"teacher_id": string,"timezone": string,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"duration_min"?: number,"end_date"?: string | null,"format"?: Database["public"]['Enums']["lesson_format"],"frequency"?: Database["public"]['Enums']["series_frequency"],"id"?: string,"level"?: Database["public"]['Enums']["cefr_level"] | null,"local_start_time"?: string,"location"?: string | null,"materialized_until"?: string | null,"meeting_url"?: string | null,"start_date"?: string,"teacher_id"?: string,"timezone"?: string,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_series_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_tags": {
                  Row: {
                    "lesson_id": string,"tag_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "lesson_id": string,"tag_id": string
                  }
                  Update: {
                    "lesson_id"?: string,"tag_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_tags_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons": {
                  Row: {
                    "cancel_reason": string | null,"cancelled_at": string | null,"cancelled_by": string | null,"created_at": string,"end_at": string,"format": Database["public"]['Enums']["lesson_format"],"id": string,"is_exception": boolean,"level": Database["public"]['Enums']["cefr_level"] | null,"location": string | null,"meeting_url": string | null,"original_start_at": string | null,"series_id": string | null,"start_at": string,"status": Database["public"]['Enums']["lesson_status"],"teacher_id": string,"timezone": string,"title": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"created_at"?: string,"end_at": string,"format"?: Database["public"]['Enums']["lesson_format"],"id"?: string,"is_exception"?: boolean,"level"?: Database["public"]['Enums']["cefr_level"] | null,"location"?: string | null,"meeting_url"?: string | null,"original_start_at"?: string | null,"series_id"?: string | null,"start_at": string,"status"?: Database["public"]['Enums']["lesson_status"],"teacher_id": string,"timezone": string,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "cancel_reason"?: string | null,"cancelled_at"?: string | null,"cancelled_by"?: string | null,"created_at"?: string,"end_at"?: string,"format"?: Database["public"]['Enums']["lesson_format"],"id"?: string,"is_exception"?: boolean,"level"?: Database["public"]['Enums']["cefr_level"] | null,"location"?: string | null,"meeting_url"?: string | null,"original_start_at"?: string | null,"series_id"?: string | null,"start_at"?: string,"status"?: Database["public"]['Enums']["lesson_status"],"teacher_id"?: string,"timezone"?: string,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lessons_series_id_fkey"
      columns: ["series_id"]
isOneToOne: false
      referencedRelation: "lesson_series"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lessons_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notes": {
                  Row: {
                    "author_id": string | null,"body": string,"created_at": string,"id": string,"student_id": string,"teacher_id": string,"updated_at": string,"visibility": Database["public"]['Enums']["note_visibility"]
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"body": string,"created_at"?: string,"id"?: string,"student_id": string,"teacher_id": string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["note_visibility"]
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"student_id"?: string,"teacher_id"?: string,"updated_at"?: string,"visibility"?: Database["public"]['Enums']["note_visibility"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "notes_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notes_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notes_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "access_paused_at": string | null,"created_at": string,"display_name": string,"email": string | null,"id": string,"locale": Database["public"]['Enums']["app_locale"],"privacy_consent_at": string | null,"privacy_consent_version": string | null,"reminder_offsets_min": (number)[],"role": Database["public"]['Enums']["app_role"],"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "access_paused_at"?: string | null,"created_at"?: string,"display_name"?: string,"email"?: string | null,"id": string,"locale"?: Database["public"]['Enums']["app_locale"],"privacy_consent_at"?: string | null,"privacy_consent_version"?: string | null,"reminder_offsets_min"?: (number)[],"role"?: Database["public"]['Enums']["app_role"],"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "access_paused_at"?: string | null,"created_at"?: string,"display_name"?: string,"email"?: string | null,"id"?: string,"locale"?: Database["public"]['Enums']["app_locale"],"privacy_consent_at"?: string | null,"privacy_consent_version"?: string | null,"reminder_offsets_min"?: (number)[],"role"?: Database["public"]['Enums']["app_role"],"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"series_participants": {
                  Row: {
                    "series_id": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "series_id": string,"student_id": string
                  }
                  Update: {
                    "series_id"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "series_participants_series_id_fkey"
      columns: ["series_id"]
isOneToOne: false
      referencedRelation: "lesson_series"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "series_participants_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"series_tags": {
                  Row: {
                    "series_id": string,"tag_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "series_id": string,"tag_id": string
                  }
                  Update: {
                    "series_id"?: string,"tag_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "series_tags_series_id_fkey"
      columns: ["series_id"]
isOneToOne: false
      referencedRelation: "lesson_series"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "series_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    }
                  ]
                },"student_tags": {
                  Row: {
                    "student_id": string,"tag_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "student_id": string,"tag_id": string
                  }
                  Update: {
                    "student_id"?: string,"tag_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_tags_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_tags_tag_id_fkey"
      columns: ["tag_id"]
isOneToOne: false
      referencedRelation: "tags"
      referencedColumns: ["id"]
    }
                  ]
                },"students": {
                  Row: {
                    "created_at": string,"currency": Database["public"]['Enums']["currency_code"],"current_level": Database["public"]['Enums']["cefr_level"] | null,"email": string | null,"first_name": string,"goal": string | null,"guardian_consent_at": string | null,"guardian_email": string | null,"guardian_name": string | null,"guardian_phone": string | null,"hourly_rate": number | null,"id": string,"is_minor": boolean,"last_name": string | null,"locale": Database["public"]['Enums']["app_locale"],"phone": string | null,"profile_id": string | null,"search_text": string | null,"start_level": Database["public"]['Enums']["cefr_level"] | null,"status": Database["public"]['Enums']["student_status"],"teacher_id": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"currency"?: Database["public"]['Enums']["currency_code"],"current_level"?: Database["public"]['Enums']["cefr_level"] | null,"email"?: string | null,"first_name": string,"goal"?: string | null,"guardian_consent_at"?: string | null,"guardian_email"?: string | null,"guardian_name"?: string | null,"guardian_phone"?: string | null,"hourly_rate"?: number | null,"id"?: string,"is_minor"?: boolean,"last_name"?: string | null,"locale"?: Database["public"]['Enums']["app_locale"],"phone"?: string | null,"profile_id"?: string | null,"search_text"?: never,"start_level"?: Database["public"]['Enums']["cefr_level"] | null,"status"?: Database["public"]['Enums']["student_status"],"teacher_id": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: Database["public"]['Enums']["currency_code"],"current_level"?: Database["public"]['Enums']["cefr_level"] | null,"email"?: string | null,"first_name"?: string,"goal"?: string | null,"guardian_consent_at"?: string | null,"guardian_email"?: string | null,"guardian_name"?: string | null,"guardian_phone"?: string | null,"hourly_rate"?: number | null,"id"?: string,"is_minor"?: boolean,"last_name"?: string | null,"locale"?: Database["public"]['Enums']["app_locale"],"phone"?: string | null,"profile_id"?: string | null,"search_text"?: never,"start_level"?: Database["public"]['Enums']["cefr_level"] | null,"status"?: Database["public"]['Enums']["student_status"],"teacher_id"?: string,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "students_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "students_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tags": {
                  Row: {
                    "color": string,"created_at": string,"id": string,"label": string,"teacher_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color": string,"created_at"?: string,"id"?: string,"label": string,"teacher_id": string
                  }
                  Update: {
                    "color"?: string,"created_at"?: string,"id"?: string,"label"?: string,"teacher_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tags_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"teacher_settings": {
                  Row: {
                    "buffer_minutes": number,"cancel_deadline_hours": number,"default_duration_min": number,"default_timezone": string,"teacher_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "buffer_minutes"?: number,"cancel_deadline_hours"?: number,"default_duration_min"?: number,"default_timezone"?: string,"teacher_id": string,"updated_at"?: string
                  }
                  Update: {
                    "buffer_minutes"?: number,"cancel_deadline_hours"?: number,"default_duration_min"?: number,"default_timezone"?: string,"teacher_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "teacher_settings_teacher_id_fkey"
      columns: ["teacher_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_privacy_policy":
{ Args: { "p_version": string }; Returns: undefined
                           },
"cancel_lesson":
{ Args: { "p_lesson_id": string,"p_reason": string }; Returns: undefined
                           },
"check_conflicts":
{ Args: { "p_ends": (string)[],"p_ignore_lesson_ids"?: (string)[],"p_starts": (string)[],"p_teacher_id": string }; Returns: {
              "end_at": string,"kind": string,"label": string,"lesson_id": string,"range_index": number,"start_at": string
            }[]
                           },
"complete_invitation":
{ Args: { "p_invitation_id": string,"p_user_id": string }; Returns: boolean
                           },
"create_lesson":
{ Args: { "p_end_at": string,"p_format": Database["public"]['Enums']["lesson_format"],"p_level": Database["public"]['Enums']["cefr_level"],"p_location": string,"p_meeting_url": string,"p_start_at": string,"p_student_ids": (string)[],"p_tag_ids": (string)[],"p_teacher_id": string,"p_timezone": string,"p_title": string }; Returns: string
                           },
"create_lesson_series":
{ Args: { "p_duration_min": number,"p_end_date": string,"p_format": Database["public"]['Enums']["lesson_format"],"p_frequency": Database["public"]['Enums']["series_frequency"],"p_level": Database["public"]['Enums']["cefr_level"],"p_local_start_time": string,"p_location": string,"p_meeting_url": string,"p_start_date": string,"p_student_ids": (string)[],"p_tag_ids": (string)[],"p_teacher_id": string,"p_timezone": string,"p_title": string }; Returns: {
              "created": number,"series_id": string,"skipped": number
            }[]
                           },
"create_student_invitation":
{ Args: { "p_student_id": string }; Returns: {
              "code": string,"expires_at": string
            }[]
                           },
"create_teacher_invitation":
{ Args: Record<PropertyKey, never>; Returns: {
              "code": string,"expires_at": string
            }[]
                           },
"end_series":
{ Args: { "p_lesson_id": string }; Returns: number
                           },
"find_open_invitation":
{ Args: { "p_code": string }; Returns: {
              "display_name": string,"invitation_id": string,"locale": Database["public"]['Enums']["app_locale"],"role": Database["public"]['Enums']["app_role"],"student_id": string,"timezone": string
            }[]
                           },
"mark_lesson_held":
{ Args: { "p_attendance": Json,"p_lesson_id": string }; Returns: undefined
                           },
"preview_series":
{ Args: { "p_duration_min": number,"p_end_date": string,"p_frequency": Database["public"]['Enums']["series_frequency"],"p_local_start_time": string,"p_start_date": string,"p_timezone": string }; Returns: {
              "end_at": string,"start_at": string
            }[]
                           },
"reschedule_lesson":
{ Args: { "p_end_at": string,"p_lesson_id": string,"p_start_at": string }; Returns: undefined
                           },
"restore_lesson":
{ Args: { "p_lesson_id": string }; Returns: undefined
                           },
"revoke_invitation":
{ Args: { "p_invitation_id": string }; Returns: undefined
                           },
"set_access_paused":
{ Args: { "p_paused": boolean,"p_profile_id": string }; Returns: undefined
                           },
"student_invitation_status":
{ Args: { "p_student_id": string }; Returns: {
              "created_at": string,"expires_at": string
            }[]
                           },
"update_lesson":
{ Args: { "p_end_at": string,"p_format": Database["public"]['Enums']["lesson_format"],"p_lesson_id": string,"p_level": Database["public"]['Enums']["cefr_level"],"p_location": string,"p_meeting_url": string,"p_start_at": string,"p_student_ids": (string)[],"p_tag_ids": (string)[],"p_title": string }; Returns: undefined
                           },
"update_series_from":
{ Args: { "p_duration_min": number,"p_format": Database["public"]['Enums']["lesson_format"],"p_frequency": Database["public"]['Enums']["series_frequency"],"p_lesson_id": string,"p_level": Database["public"]['Enums']["cefr_level"],"p_local_start_time": string,"p_location": string,"p_meeting_url": string,"p_start_date": string,"p_student_ids": (string)[],"p_tag_ids": (string)[],"p_title": string }; Returns: {
              "created": number,"series_id": string,"skipped": number
            }[]
                           }
          }
          Enums: {
            "app_locale": "de"|"vi","app_role": "admin"|"teacher"|"student","attendance_status": "pending"|"present"|"excused"|"absent","cefr_level": "A1"|"A2"|"B1"|"B2","currency_code": "EUR"|"VND","lesson_format": "online"|"in_person","lesson_status": "scheduled"|"held"|"cancelled","note_visibility": "student"|"teacher","series_frequency": "weekly"|"biweekly","student_status": "active"|"inactive"|"archived"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_locale": ["de", "vi"],"app_role": ["admin", "teacher", "student"],"attendance_status": ["pending", "present", "excused", "absent"],"cefr_level": ["A1", "A2", "B1", "B2"],"currency_code": ["EUR", "VND"],"lesson_format": ["online", "in_person"],"lesson_status": ["scheduled", "held", "cancelled"],"note_visibility": ["student", "teacher"],"series_frequency": ["weekly", "biweekly"],"student_status": ["active", "inactive", "archived"]
          }
        }
} as const
