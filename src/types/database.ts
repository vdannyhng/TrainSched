
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
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"email": string | null,"id": string,"locale": Database["public"]['Enums']["app_locale"],"privacy_consent_at": string | null,"privacy_consent_version": string | null,"reminder_offsets_min": (number)[],"role": Database["public"]['Enums']["app_role"],"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string,"email"?: string | null,"id": string,"locale"?: Database["public"]['Enums']["app_locale"],"privacy_consent_at"?: string | null,"privacy_consent_version"?: string | null,"reminder_offsets_min"?: (number)[],"role"?: Database["public"]['Enums']["app_role"],"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"email"?: string | null,"id"?: string,"locale"?: Database["public"]['Enums']["app_locale"],"privacy_consent_at"?: string | null,"privacy_consent_version"?: string | null,"reminder_offsets_min"?: (number)[],"role"?: Database["public"]['Enums']["app_role"],"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"students": {
                  Row: {
                    "created_at": string,"currency": Database["public"]['Enums']["currency_code"],"current_level": Database["public"]['Enums']["cefr_level"] | null,"email": string | null,"first_name": string,"goal": string | null,"guardian_consent_at": string | null,"guardian_email": string | null,"guardian_name": string | null,"guardian_phone": string | null,"hourly_rate": number | null,"id": string,"is_minor": boolean,"last_name": string | null,"locale": Database["public"]['Enums']["app_locale"],"phone": string | null,"profile_id": string | null,"start_level": Database["public"]['Enums']["cefr_level"] | null,"status": Database["public"]['Enums']["student_status"],"teacher_id": string,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"currency"?: Database["public"]['Enums']["currency_code"],"current_level"?: Database["public"]['Enums']["cefr_level"] | null,"email"?: string | null,"first_name": string,"goal"?: string | null,"guardian_consent_at"?: string | null,"guardian_email"?: string | null,"guardian_name"?: string | null,"guardian_phone"?: string | null,"hourly_rate"?: number | null,"id"?: string,"is_minor"?: boolean,"last_name"?: string | null,"locale"?: Database["public"]['Enums']["app_locale"],"phone"?: string | null,"profile_id"?: string | null,"start_level"?: Database["public"]['Enums']["cefr_level"] | null,"status"?: Database["public"]['Enums']["student_status"],"teacher_id": string,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"currency"?: Database["public"]['Enums']["currency_code"],"current_level"?: Database["public"]['Enums']["cefr_level"] | null,"email"?: string | null,"first_name"?: string,"goal"?: string | null,"guardian_consent_at"?: string | null,"guardian_email"?: string | null,"guardian_name"?: string | null,"guardian_phone"?: string | null,"hourly_rate"?: number | null,"id"?: string,"is_minor"?: boolean,"last_name"?: string | null,"locale"?: Database["public"]['Enums']["app_locale"],"phone"?: string | null,"profile_id"?: string | null,"start_level"?: Database["public"]['Enums']["cefr_level"] | null,"status"?: Database["public"]['Enums']["student_status"],"teacher_id"?: string,"timezone"?: string,"updated_at"?: string
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
"complete_invitation":
{ Args: { "p_invitation_id": string,"p_user_id": string }; Returns: boolean
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
"find_open_invitation":
{ Args: { "p_code": string }; Returns: {
              "display_name": string,"invitation_id": string,"locale": Database["public"]['Enums']["app_locale"],"role": Database["public"]['Enums']["app_role"],"student_id": string,"timezone": string
            }[]
                           },
"revoke_invitation":
{ Args: { "p_invitation_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "app_locale": "de"|"vi","app_role": "admin"|"teacher"|"student","cefr_level": "A1"|"A2"|"B1"|"B2","currency_code": "EUR"|"VND","student_status": "active"|"inactive"|"archived"
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
            "app_locale": ["de", "vi"],"app_role": ["admin", "teacher", "student"],"cefr_level": ["A1", "A2", "B1", "B2"],"currency_code": ["EUR", "VND"],"student_status": ["active", "inactive", "archived"]
          }
        }
} as const
