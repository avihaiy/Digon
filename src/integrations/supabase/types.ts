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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      aliyot: {
        Row: {
          aliya_type: Database["public"]["Enums"]["aliya_type"]
          created_at: string | null
          id: string
          member_id: string | null
          notes: string | null
          parasha: string
          price: number | null
          shabbat_date: string
          status: Database["public"]["Enums"]["aliya_status"] | null
          updated_at: string | null
        }
        Insert: {
          aliya_type: Database["public"]["Enums"]["aliya_type"]
          created_at?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          parasha: string
          price?: number | null
          shabbat_date: string
          status?: Database["public"]["Enums"]["aliya_status"] | null
          updated_at?: string | null
        }
        Update: {
          aliya_type?: Database["public"]["Enums"]["aliya_type"]
          created_at?: string | null
          id?: string
          member_id?: string | null
          notes?: string | null
          parasha?: string
          price?: number | null
          shabbat_date?: string
          status?: Database["public"]["Enums"]["aliya_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aliyot_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          show_on_shabbat: boolean | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          show_on_shabbat?: boolean | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          show_on_shabbat?: boolean | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bracha_packages: {
        Row: {
          balance: number
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          member_id: string
          package_type: string
          price_paid: number
          total_brachot: number
          updated_at: string
          used_brachot: number
        }
        Insert: {
          balance?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          member_id: string
          package_type?: string
          price_paid?: number
          total_brachot?: number
          updated_at?: string
          used_brachot?: number
        }
        Update: {
          balance?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          member_id?: string
          package_type?: string
          price_paid?: number
          total_brachot?: number
          updated_at?: string
          used_brachot?: number
        }
        Relationships: [
          {
            foreignKeyName: "bracha_packages_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: []
      }
      budget_transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          payment_id: string | null
          reference: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          payment_id?: string | null
          reference?: string | null
          transaction_date?: string
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          payment_id?: string | null
          reference?: string | null
          transaction_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      charge_payments: {
        Row: {
          amount: number
          charge_id: string
          created_at: string
          id: string
          payment_id: string | null
        }
        Insert: {
          amount: number
          charge_id: string
          created_at?: string
          id?: string
          payment_id?: string | null
        }
        Update: {
          amount?: number
          charge_id?: string
          created_at?: string
          id?: string
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charge_payments_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "member_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charge_payments_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          available_quantity: number
          category: Database["public"]["Enums"]["equipment_category"]
          created_at: string
          description: string | null
          id: string
          name: string
          notes: string | null
          quantity: number
          status: Database["public"]["Enums"]["equipment_status"]
          updated_at: string
        }
        Insert: {
          available_quantity?: number
          category?: Database["public"]["Enums"]["equipment_category"]
          created_at?: string
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          category?: Database["public"]["Enums"]["equipment_category"]
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Relationships: []
      }
      equipment_loans: {
        Row: {
          actual_return_date: string | null
          created_at: string
          created_by: string | null
          equipment_id: string
          expected_return_date: string | null
          id: string
          loan_date: string
          member_id: string
          notes: string | null
          purpose: string | null
          quantity: number
          status: Database["public"]["Enums"]["loan_status"]
          updated_at: string
        }
        Insert: {
          actual_return_date?: string | null
          created_at?: string
          created_by?: string | null
          equipment_id: string
          expected_return_date?: string | null
          id?: string
          loan_date?: string
          member_id: string
          notes?: string | null
          purpose?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
        }
        Update: {
          actual_return_date?: string | null
          created_at?: string
          created_by?: string | null
          equipment_id?: string
          expected_return_date?: string | null
          id?: string
          loan_date?: string
          member_id?: string
          notes?: string | null
          purpose?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["loan_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_loans_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_loans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          location: string | null
          reminder_hours_before: number | null
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          reminder_hours_before?: number | null
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          reminder_hours_before?: number | null
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      expense_attachments: {
        Row: {
          created_at: string
          expense_id: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
        }
        Insert: {
          created_at?: string
          expense_id: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
        }
        Update: {
          created_at?: string
          expense_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_attachments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          expense_date: string
          id: string
          notes: string | null
          supplier: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      heichal_names: {
        Row: {
          created_at: string | null
          father_name: string | null
          hebrew_day: number
          hebrew_month: number
          id: string
          is_active: boolean | null
          is_male: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          father_name?: string | null
          hebrew_day: number
          hebrew_month: number
          id?: string
          is_active?: boolean | null
          is_male?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          father_name?: string | null
          hebrew_day?: number
          hebrew_month?: number
          id?: string
          is_active?: boolean | null
          is_male?: boolean | null
          name?: string
        }
        Relationships: []
      }
      member_area_logins: {
        Row: {
          created_at: string
          id: string
          member_id: string
          success: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      member_charges: {
        Row: {
          amount: number
          charge_date: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          member_id: string
          remaining_balance: number
          updated_at: string
        }
        Insert: {
          amount: number
          charge_date?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          member_id: string
          remaining_balance: number
          updated_at?: string
        }
        Update: {
          amount?: number
          charge_date?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          member_id?: string
          remaining_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_charges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          active: boolean | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          notification_preference: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          notification_preference?: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          notification_preference?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      memorial_names: {
        Row: {
          created_at: string
          deceased_name: string
          family_member_id: string | null
          father_name: string
          gregorian_death_date: string | null
          hebrew_death_day: number
          hebrew_death_month: number
          id: string
          is_active: boolean | null
          is_male: boolean | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deceased_name: string
          family_member_id?: string | null
          father_name: string
          gregorian_death_date?: string | null
          hebrew_death_day: number
          hebrew_death_month: number
          id?: string
          is_active?: boolean | null
          is_male?: boolean | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deceased_name?: string
          family_member_id?: string | null
          father_name?: string
          gregorian_death_date?: string | null
          hebrew_death_day?: number
          hebrew_death_month?: number
          id?: string
          is_active?: boolean | null
          is_male?: boolean | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_names_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          aliya_id: string | null
          amount: number
          created_at: string | null
          hall_event_type: string | null
          id: string
          installment_group_id: string | null
          installment_number: number | null
          installment_total_amount: number | null
          member_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          payment_type: string
          quantity: number | null
          received_by: string | null
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          total_installments: number | null
          unit_price: number | null
        }
        Insert: {
          aliya_id?: string | null
          amount: number
          created_at?: string | null
          hall_event_type?: string | null
          id?: string
          installment_group_id?: string | null
          installment_number?: number | null
          installment_total_amount?: number | null
          member_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_type?: string
          quantity?: number | null
          received_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          total_installments?: number | null
          unit_price?: number | null
        }
        Update: {
          aliya_id?: string | null
          amount?: number
          created_at?: string | null
          hall_event_type?: string | null
          id?: string
          installment_group_id?: string | null
          installment_number?: number | null
          installment_total_amount?: number | null
          member_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          payment_type?: string
          quantity?: number | null
          received_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          total_installments?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_aliya_id_fkey"
            columns: ["aliya_id"]
            isOneToOne: false
            referencedRelation: "aliyot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      prayer_times: {
        Row: {
          created_at: string
          day_type: string
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_type?: string
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          time?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          member_id: string
          payment_id: string | null
          receipt_number: number | null
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          member_id: string
          payment_id?: string | null
          receipt_number?: number | null
          total_amount: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          member_id?: string
          payment_id?: string | null
          receipt_number?: number | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_dismissed: boolean
          is_important: boolean
          notified: boolean
          recurrence: string | null
          reminder_date: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_dismissed?: boolean
          is_important?: boolean
          notified?: boolean
          recurrence?: string | null
          reminder_date?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_dismissed?: boolean
          is_important?: boolean
          notified?: boolean
          recurrence?: string | null
          reminder_date?: string
        }
        Relationships: []
      }
      scheduled_announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          day_types: string[]
          duration_seconds: number | null
          end_time: string
          font_color: string | null
          font_size: number | null
          id: string
          image_url: string | null
          is_active: boolean
          priority: number
          start_time: string
          style: Database["public"]["Enums"]["announcement_style"]
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          day_types?: string[]
          duration_seconds?: number | null
          end_time?: string
          font_color?: string | null
          font_size?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          priority?: number
          start_time?: string
          style?: Database["public"]["Enums"]["announcement_style"]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          day_types?: string[]
          duration_seconds?: number | null
          end_time?: string
          font_color?: string | null
          font_size?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          priority?: number
          start_time?: string
          style?: Database["public"]["Enums"]["announcement_style"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      sifrei_torah: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sifrei_torah_schedule: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          scheduled_date: string
          sefer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          scheduled_date: string
          sefer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          scheduled_date?: string
          sefer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sifrei_torah_schedule_sefer_id_fkey"
            columns: ["sefer_id"]
            isOneToOne: false
            referencedRelation: "sifrei_torah"
            referencedColumns: ["id"]
          },
        ]
      }
      ticker_items: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          text: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          text: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          text?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_email_by_username: { Args: { _username: string }; Returns: string }
      get_member_area_data: {
        Args: { _member_id: string; _phone: string; _user_agent?: string }
        Returns: Json
      }
      get_public_finance_display_stats: {
        Args: { months_count?: number }
        Returns: Json
      }
      get_public_member_debts: { Args: { _member_id: string }; Returns: Json }
      get_public_member_profile: { Args: { _member_id: string }; Returns: Json }
      get_public_receipt: { Args: { _receipt_number: number }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager: { Args: { _user_id: string }; Returns: boolean }
      record_bit_payment_intent: {
        Args: { _amount: number; _member_id: string; _user_agent?: string }
        Returns: Json
      }
    }
    Enums: {
      aliya_status: "pending" | "paid" | "waived"
      aliya_type:
        | "kohen"
        | "levi"
        | "shlishi"
        | "revii"
        | "chamishi"
        | "shishi"
        | "shvii"
        | "maftir"
        | "hagbaha"
        | "glila"
        | "general"
      announcement_style:
        | "traditional_gold"
        | "modern_dark"
        | "clean_white"
        | "royal_blue"
      app_role: "admin" | "gabai" | "viewer"
      equipment_category: "hall" | "furniture" | "books" | "events" | "other"
      equipment_status: "available" | "loaned" | "maintenance" | "retired"
      event_type:
        | "wedding"
        | "bar_mitzvah"
        | "memorial"
        | "lesson"
        | "meeting"
        | "holiday"
        | "other"
      loan_status: "active" | "returned" | "overdue"
      payment_method: "bit" | "cash" | "check" | "bank_transfer"
      payment_status: "pending" | "confirmed"
      transaction_type: "income" | "expense"
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
      aliya_status: ["pending", "paid", "waived"],
      aliya_type: [
        "kohen",
        "levi",
        "shlishi",
        "revii",
        "chamishi",
        "shishi",
        "shvii",
        "maftir",
        "hagbaha",
        "glila",
        "general",
      ],
      announcement_style: [
        "traditional_gold",
        "modern_dark",
        "clean_white",
        "royal_blue",
      ],
      app_role: ["admin", "gabai", "viewer"],
      equipment_category: ["hall", "furniture", "books", "events", "other"],
      equipment_status: ["available", "loaned", "maintenance", "retired"],
      event_type: [
        "wedding",
        "bar_mitzvah",
        "memorial",
        "lesson",
        "meeting",
        "holiday",
        "other",
      ],
      loan_status: ["active", "returned", "overdue"],
      payment_method: ["bit", "cash", "check", "bank_transfer"],
      payment_status: ["pending", "confirmed"],
      transaction_type: ["income", "expense"],
    },
  },
} as const
