export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          attendance_date: string
          created_at: string
          daily_rate_applied: number
          employee_id: string
          id: string
          is_present: boolean
          marked_by: string | null
          updated_at: string
        }
        Insert: {
          attendance_date: string
          created_at?: string
          daily_rate_applied?: number
          employee_id: string
          id?: string
          is_present?: boolean
          marked_by?: string | null
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          daily_rate_applied?: number
          employee_id?: string
          id?: string
          is_present?: boolean
          marked_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee"
            referencedColumns: ["id"]
          },
        ]
      }
      booking: {
        Row: {
          appointment_date: string | null
          appointment_time: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          commission_processed_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          customer_id: number
          duration_minutes: number | null
          grandDiscount: number
          grandTotal: number
          id: number
          location: string | null
          notes: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string | null
          voucher_id: number | null
        }
        Insert: {
          appointment_date?: string | null
          appointment_time?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          commission_processed_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id: number
          duration_minutes?: number | null
          grandDiscount?: number
          grandTotal?: number
          id?: number
          location?: string | null
          notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string | null
          voucher_id?: number | null
        }
        Update: {
          appointment_date?: string | null
          appointment_time?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          commission_processed_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          customer_id?: number
          duration_minutes?: number | null
          grandDiscount?: number
          grandTotal?: number
          id?: number
          location?: string | null
          notes?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string | null
          voucher_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "voucher"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_transaction: {
        Row: {
          amount: number
          applied_at: string | null
          booking_id: number
          commission_rate: number
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          reverted_at: string | null
          role_at_time: string
          service_booking_id: number
          service_price: number
          status: string
          transaction_type: string
        }
        Insert: {
          amount: number
          applied_at?: string | null
          booking_id: number
          commission_rate: number
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          reverted_at?: string | null
          role_at_time: string
          service_booking_id: number
          service_price: number
          status?: string
          transaction_type: string
        }
        Update: {
          amount?: number
          applied_at?: string | null
          booking_id?: number
          commission_rate?: number
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          reverted_at?: string | null
          role_at_time?: string
          service_booking_id?: number
          service_price?: number
          status?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_transaction_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_transaction_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_transaction_service_booking_id_fkey"
            columns: ["service_booking_id"]
            isOneToOne: false
            referencedRelation: "service_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      customer: {
        Row: {
          created_at: string
          email: string | null
          id: number
          last_transaction: string | null
          name: string
          phone: string | null
          spent: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
          last_transaction?: string | null
          name: string
          phone?: string | null
          spent?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
          last_transaction?: string | null
          name?: string
          phone?: string | null
          spent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_reminders: {
        Row: {
          booking_id: number
          created_at: string
          id: string
          reminder_minutes: number
          sent_at: string
        }
        Insert: {
          booking_id: number
          created_at?: string
          id?: string
          reminder_minutes: number
          sent_at?: string
        }
        Update: {
          booking_id?: number
          created_at?: string
          id?: string
          reminder_minutes?: number
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_reminders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "booking"
            referencedColumns: ["id"]
          },
        ]
      }
      employee: {
        Row: {
          can_request_payslip: boolean
          commission_rate: number
          created_at: string
          daily_rate: number
          id: string
          last_payslip_release: string | null
          name: string | null
          role: Database["public"]["Enums"]["employee_role"]
          salary: number
          updated_at: string
          user_id: string
        }
        Insert: {
          can_request_payslip?: boolean
          commission_rate?: number
          created_at?: string
          daily_rate?: number
          id?: string
          last_payslip_release?: string | null
          name?: string | null
          role: Database["public"]["Enums"]["employee_role"]
          salary?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          can_request_payslip?: boolean
          commission_rate?: number
          created_at?: string
          daily_rate?: number
          id?: string
          last_payslip_release?: string | null
          name?: string | null
          role?: Database["public"]["Enums"]["employee_role"]
          salary?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      gift_certificate: {
        Row: {
          code: string
          created_at: string
          customer_email: string | null
          customer_id: number | null
          customer_name: string | null
          expires_on: string | null
          id: number
          status: Database["public"]["Enums"]["gift_certificate_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          customer_email?: string | null
          customer_id?: number | null
          customer_name?: string | null
          expires_on?: string | null
          id?: number
          status?: Database["public"]["Enums"]["gift_certificate_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          customer_email?: string | null
          customer_id?: number | null
          customer_name?: string | null
          expires_on?: string | null
          id?: number
          status?: Database["public"]["Enums"]["gift_certificate_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_certificate_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_certificate_service_sets: {
        Row: {
          created_at: string
          gift_certificate_id: number
          id: number
          quantity: number
          service_set_id: number
        }
        Insert: {
          created_at?: string
          gift_certificate_id: number
          id?: number
          quantity?: number
          service_set_id: number
        }
        Update: {
          created_at?: string
          gift_certificate_id?: number
          id?: number
          quantity?: number
          service_set_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_certificate_service_sets_gift_certificate_id_fkey"
            columns: ["gift_certificate_id"]
            isOneToOne: false
            referencedRelation: "gift_certificate"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_certificate_service_sets_service_set_id_fkey"
            columns: ["service_set_id"]
            isOneToOne: false
            referencedRelation: "service_set"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_certificate_services: {
        Row: {
          created_at: string
          gift_certificate_id: number
          id: number
          quantity: number
          service_id: number
        }
        Insert: {
          created_at?: string
          gift_certificate_id: number
          id?: number
          quantity?: number
          service_id: number
        }
        Update: {
          created_at?: string
          gift_certificate_id?: number
          id?: number
          quantity?: number
          service_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "gift_certificate_services_gift_certificate_id_fkey"
            columns: ["gift_certificate_id"]
            isOneToOne: false
            referencedRelation: "gift_certificate"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_certificate_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service"
            referencedColumns: ["id"]
          },
        ]
      }
      payslip_attendance: {
        Row: {
          amount: number
          attendance_id: string
          created_at: string
          id: string
          payslip_release_id: string
        }
        Insert: {
          amount: number
          attendance_id: string
          created_at?: string
          id?: string
          payslip_release_id: string
        }
        Update: {
          amount?: number
          attendance_id?: string
          created_at?: string
          id?: string
          payslip_release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslip_attendance_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslip_attendance_payslip_release_id_fkey"
            columns: ["payslip_release_id"]
            isOneToOne: false
            referencedRelation: "payslip_release"
            referencedColumns: ["id"]
          },
        ]
      }
      payslip_commission: {
        Row: {
          amount: number
          commission_transaction_id: string
          created_at: string
          id: string
          payslip_release_id: string
        }
        Insert: {
          amount: number
          commission_transaction_id: string
          created_at?: string
          id?: string
          payslip_release_id: string
        }
        Update: {
          amount?: number
          commission_transaction_id?: string
          created_at?: string
          id?: string
          payslip_release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslip_commission_commission_transaction_id_fkey"
            columns: ["commission_transaction_id"]
            isOneToOne: false
            referencedRelation: "commission_transaction"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslip_commission_payslip_release_id_fkey"
            columns: ["payslip_release_id"]
            isOneToOne: false
            referencedRelation: "payslip_release"
            referencedColumns: ["id"]
          },
        ]
      }
      payslip_release: {
        Row: {
          attendance_amount: number
          commission_amount: number
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          payslip_request_id: string
          period_end_date: string | null
          period_start_date: string | null
          released_at: string
          released_by: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          attendance_amount?: number
          commission_amount?: number
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          payslip_request_id: string
          period_end_date?: string | null
          period_start_date?: string | null
          released_at?: string
          released_by: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          attendance_amount?: number
          commission_amount?: number
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          payslip_request_id?: string
          period_end_date?: string | null
          period_start_date?: string | null
          released_at?: string
          released_by?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslip_release_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslip_release_payslip_request_id_fkey"
            columns: ["payslip_request_id"]
            isOneToOne: true
            referencedRelation: "payslip_request"
            referencedColumns: ["id"]
          },
        ]
      }
      payslip_request: {
        Row: {
          calculated_attendance_amount: number
          calculated_commission_amount: number
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          rejection_reason: string | null
          requested_amount: number
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payslip_request_status"]
          updated_at: string
        }
        Insert: {
          calculated_attendance_amount?: number
          calculated_commission_amount?: number
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          requested_amount: number
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payslip_request_status"]
          updated_at?: string
        }
        Update: {
          calculated_attendance_amount?: number
          calculated_commission_amount?: number
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          rejection_reason?: string | null
          requested_amount?: number
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payslip_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslip_request_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee"
            referencedColumns: ["id"]
          },
        ]
      }
      service: {
        Row: {
          branch: Database["public"]["Enums"]["branch"]
          category: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: number
          is_active: boolean | null
          price: number
          title: string
          updated_at: string | null
        }
        Insert: {
          branch?: Database["public"]["Enums"]["branch"]
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: number
          is_active?: boolean | null
          price: number
          title: string
          updated_at?: string | null
        }
        Update: {
          branch?: Database["public"]["Enums"]["branch"]
          category?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: number
          is_active?: boolean | null
          price?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_bookings: {
        Row: {
          booking_transaction_id: number | null
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          id: number
          price_at_booking: number | null
          quantity: number
          sequence_order: number | null
          served_at: string | null
          served_by: string | null
          service_id: number | null
          service_set_id: number | null
          status: Database["public"]["Enums"]["service_instance_status"]
        }
        Insert: {
          booking_transaction_id?: number | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: number
          price_at_booking?: number | null
          quantity?: number
          sequence_order?: number | null
          served_at?: string | null
          served_by?: string | null
          service_id?: number | null
          service_set_id?: number | null
          status?: Database["public"]["Enums"]["service_instance_status"]
        }
        Update: {
          booking_transaction_id?: number | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          id?: number
          price_at_booking?: number | null
          quantity?: number
          sequence_order?: number | null
          served_at?: string | null
          served_by?: string | null
          service_id?: number | null
          service_set_id?: number | null
          status?: Database["public"]["Enums"]["service_instance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "service_bookings_booking_transaction_id_fkey"
            columns: ["booking_transaction_id"]
            isOneToOne: false
            referencedRelation: "booking"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_bookings_service_set_id_fkey"
            columns: ["service_set_id"]
            isOneToOne: false
            referencedRelation: "service_set"
            referencedColumns: ["id"]
          },
        ]
      }
      service_set: {
        Row: {
          branch: string
          created_at: string
          description: string | null
          id: number
          is_active: boolean
          price: number
          title: string
          updated_at: string | null
        }
        Insert: {
          branch: string
          created_at?: string
          description?: string | null
          id?: number
          is_active?: boolean
          price: number
          title: string
          updated_at?: string | null
        }
        Update: {
          branch?: string
          created_at?: string
          description?: string | null
          id?: number
          is_active?: boolean
          price?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_set_items: {
        Row: {
          adjusted_price: number | null
          created_at: string
          id: number
          service_id: number
          service_set_id: number
        }
        Insert: {
          adjusted_price?: number | null
          created_at?: string
          id?: number
          service_id: number
          service_set_id: number
        }
        Update: {
          adjusted_price?: number | null
          created_at?: string
          id?: number
          service_id?: number
          service_set_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_set_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_set_items_service_set_id_fkey"
            columns: ["service_set_id"]
            isOneToOne: false
            referencedRelation: "service_set"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher: {
        Row: {
          code: string
          created_at: string
          customer_id: number | null
          expires_on: string | null
          id: number
          status: Database["public"]["Enums"]["voucher_status"]
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          customer_id?: number | null
          expires_on?: string | null
          id?: number
          status?: Database["public"]["Enums"]["voucher_status"]
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          customer_id?: number | null
          expires_on?: string | null
          id?: number
          status?: Database["public"]["Enums"]["voucher_status"]
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "voucher_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      all_services_served_for_minute: {
        Args: { p_booking_id: number }
        Returns: boolean
      }
      apply_commissions_for_booking: {
        Args: { p_booking_id: number }
        Returns: {
          employee_id: string
          total_commission: number
          transactions_created: number
        }[]
      }
      apply_missing_commissions_for_served_services: {
        Args: never
        Returns: {
          booking_id: number
          commission_amount: number
          employee_id: string
          message: string
          services_count: number
        }[]
      }
      approve_payslip_request: {
        Args: {
          p_notes?: string
          p_period_end_date?: string
          p_period_start_date?: string
          p_request_id: string
          p_reviewer_user_id: string
        }
        Returns: {
          error_message: string
          payslip_release_id: string
          success: boolean
        }[]
      }
      calculate_commission:
        | {
            Args: { p_roles: string[]; p_service_price: number }
            Returns: number
          }
        | { Args: { p_role: string; p_service_price: number }; Returns: number }
      calculate_unpaid_payslip_amount: {
        Args: { p_employee_id: string }
        Returns: {
          attendance_amount: number
          commission_amount: number
          total_amount: number
        }[]
      }
      check_and_apply_commissions_manual: {
        Args: { p_booking_id: number }
        Returns: {
          applied: boolean
          message: string
        }[]
      }
      create_employee_user: {
        Args: { p_email: string; p_name: string; p_password: string }
        Returns: Json
      }
      create_payslip_request: {
        Args: { p_employee_id: string }
        Returns: {
          error_message: string
          payslip_request_id: string
          requested_amount: number
          success: boolean
        }[]
      }
      get_commission_rate: { Args: { p_role: string }; Returns: number }
      get_employees_with_user_info: {
        Args: never
        Returns: {
          created_at: string
          daily_rate: number
          employee_id: string
          role: Database["public"]["Enums"]["employee_role"]
          salary: number
          user_email: string
          user_id: string
        }[]
      }
      mark_attendance_and_update_salary: {
        Args: {
          p_attendance_date: string
          p_employee_id: string
          p_is_present: boolean
          p_marked_by: string
        }
        Returns: Json
      }
      reject_payslip_request: {
        Args: {
          p_rejection_reason: string
          p_request_id: string
          p_reviewer_user_id: string
        }
        Returns: {
          error_message: string
          success: boolean
        }[]
      }
      revert_commissions_for_booking: {
        Args: { p_booking_id: number }
        Returns: {
          employee_id: string
          new_salary: number
          reverted_amount: number
        }[]
      }
      toggle_employee_payslip_permission: {
        Args: {
          p_can_request: boolean
          p_employee_id: string
          p_owner_user_id: string
        }
        Returns: {
          error_message: string
          success: boolean
        }[]
      }
      update_employee_user: {
        Args: { p_email?: string; p_password?: string; p_user_id: string }
        Returns: Json
      }
      update_expired_gift_certificates: { Args: never; Returns: undefined }
      update_expired_vouchers: { Args: never; Returns: undefined }
    }
    Enums: {
      booking_status:
        | "PENDING"
        | "PAID"
        | "CANCELLED"
        | "CONFIRMED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "NO_SHOW"
      branch: "NAILS" | "SKIN" | "LASHES" | "MASSAGE"
      employee_role: "OWNER" | "CASHIER" | "MASSEUSE" | "WORKER"
      gift_certificate_status: "ACTIVE" | "USED" | "EXPIRED"
      payslip_request_status: "PENDING" | "APPROVED" | "REJECTED"
      service_instance_status: "UNCLAIMED" | "CLAIMED" | "SERVED"
      voucher_status: "ACTIVE" | "USED" | "EXPIRED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: [
        "PENDING",
        "PAID",
        "CANCELLED",
        "CONFIRMED",
        "IN_PROGRESS",
        "COMPLETED",
        "NO_SHOW",
      ],
      branch: ["NAILS", "SKIN", "LASHES", "MASSAGE"],
      employee_role: ["OWNER", "CASHIER", "MASSEUSE", "WORKER"],
      gift_certificate_status: ["ACTIVE", "USED", "EXPIRED"],
      payslip_request_status: ["PENDING", "APPROVED", "REJECTED"],
      service_instance_status: ["UNCLAIMED", "CLAIMED", "SERVED"],
      voucher_status: ["ACTIVE", "USED", "EXPIRED"],
    },
  },
} as const
