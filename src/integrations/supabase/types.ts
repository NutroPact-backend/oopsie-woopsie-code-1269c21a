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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          data: Json | null
          id: string
          item_count: number | null
          items: Json | null
          last_activity_at: string | null
          recovered_at: string | null
          status: string | null
          subtotal: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          data?: Json | null
          id?: string
          item_count?: number | null
          items?: Json | null
          last_activity_at?: string | null
          recovered_at?: string | null
          status?: string | null
          subtotal?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          data?: Json | null
          id?: string
          item_count?: number | null
          items?: Json | null
          last_activity_at?: string | null
          recovered_at?: string | null
          status?: string | null
          subtotal?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string | null
          admin_id: string | null
          created_at: string
          data: Json | null
          id: string
          ip: string | null
          payload: Json | null
          target_id: string | null
          target_type: string | null
          updated_at: string
        }
        Insert: {
          action?: string | null
          admin_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          ip?: string | null
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
          updated_at?: string
        }
        Update: {
          action?: string | null
          admin_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          ip?: string | null
          payload?: Json | null
          target_id?: string | null
          target_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_ip_allowlist: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          ip_cidr: string
          is_active: boolean | null
          label: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          ip_cidr: string
          is_active?: boolean | null
          label?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          ip_cidr?: string
          is_active?: boolean | null
          label?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      admin_login_attempts: {
        Row: {
          created_at: string
          data: Json | null
          email: string | null
          id: string
          ip: string | null
          success: boolean | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          email?: string | null
          id?: string
          ip?: string | null
          success?: boolean | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          email?: string | null
          id?: string
          ip?: string | null
          success?: boolean | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_secrets: {
        Row: {
          created_at: string
          data: Json | null
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      analytics_report_runs: {
        Row: {
          created_at: string
          data: Json | null
          finished_at: string | null
          id: string
          payload: Json | null
          report_key: string | null
          started_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          finished_at?: string | null
          id?: string
          payload?: Json | null
          report_key?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          finished_at?: string | null
          id?: string
          payload?: Json | null
          report_key?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      analytics_report_subscriptions: {
        Row: {
          channel: string | null
          created_at: string
          data: Json | null
          id: string
          report_key: string | null
          schedule: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          report_key?: string | null
          schedule?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          report_key?: string | null
          schedule?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_saved_views: {
        Row: {
          config: Json | null
          created_at: string
          data: Json | null
          id: string
          name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          data?: Json | null
          id?: string
          name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          data?: Json | null
          id?: string
          name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          created_at: string
          data: Json | null
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string | null
          cover_image: string | null
          created_at: string
          data: Json | null
          excerpt: string | null
          id: string
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          data?: Json | null
          excerpt?: string | null
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          cover_image?: string | null
          created_at?: string
          data?: Json | null
          excerpt?: string | null
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          data: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      bulk_campaigns: {
        Row: {
          audience: Json | null
          channel: string | null
          content: Json | null
          created_at: string
          data: Json | null
          id: string
          name: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          audience?: Json | null
          channel?: string | null
          content?: Json | null
          created_at?: string
          data?: Json | null
          id?: string
          name?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          audience?: Json | null
          channel?: string | null
          content?: Json | null
          created_at?: string
          data?: Json | null
          id?: string
          name?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          data: Json | null
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string
          parent_id: string | null
          slug: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          parent_id?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          parent_id?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          assigned_admin_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          data: Json | null
          id: string
          last_message_at: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          data?: Json | null
          id?: string
          last_message_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          data?: Json | null
          id?: string
          last_message_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_kb_articles: {
        Row: {
          content: string | null
          created_at: string
          data: Json | null
          id: string
          is_published: boolean | null
          slug: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_published?: boolean | null
          slug?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_published?: boolean | null
          slug?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachments: Json | null
          content: string | null
          conversation_id: string
          created_at: string
          data: Json | null
          id: string
          sender_id: string | null
          sender_type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attachments?: Json | null
          content?: string | null
          conversation_id: string
          created_at?: string
          data?: Json | null
          id?: string
          sender_id?: string | null
          sender_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          data?: Json | null
          id?: string
          sender_id?: string | null
          sender_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_settings: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          key: string | null
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          key?: string | null
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          key?: string | null
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      combo_rules: {
        Row: {
          created_at: string
          data: Json | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          id: string
          is_active: boolean | null
          min_quantity: number | null
          name: string | null
          product_ids: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          name?: string | null
          product_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          min_quantity?: number | null
          name?: string | null
          product_ids?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          data: Json | null
          email: string | null
          id: string
          message: string | null
          name: string | null
          phone: string | null
          status: string | null
          subject: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      content_translations: {
        Row: {
          content_key: string
          content_type: string
          created_at: string
          data: Json | null
          id: string
          language: string
          updated_at: string
          value: string | null
        }
        Insert: {
          content_key: string
          content_type: string
          created_at?: string
          data?: Json | null
          id?: string
          language: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          content_key?: string
          content_type?: string
          created_at?: string
          data?: Json | null
          id?: string
          language?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          data: Json | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          id: string
          is_active: boolean | null
          max_discount: number | null
          min_order_value: number | null
          updated_at: string
          usage_limit: number | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          data?: Json | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_value?: number | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          data?: Json | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_value?: number | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      customer_segments: {
        Row: {
          created_at: string
          data: Json | null
          description: string | null
          estimated_count: number | null
          id: string
          name: string | null
          rules: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          description?: string | null
          estimated_count?: number | null
          id?: string
          name?: string | null
          rules?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          description?: string | null
          estimated_count?: number | null
          id?: string
          name?: string | null
          rules?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      dimensions: {
        Row: {
          created_at: string
          data: Json | null
          height: number | null
          id: string
          length: number | null
          name: string | null
          unit: string | null
          updated_at: string
          weight: number | null
          width: number | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          height?: number | null
          id?: string
          length?: number | null
          name?: string | null
          unit?: string | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          height?: number | null
          id?: string
          length?: number | null
          name?: string | null
          unit?: string | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Relationships: []
      }
      email_otp_challenges: {
        Row: {
          attempts: number | null
          code_hash: string
          created_at: string
          data: Json | null
          email: string
          expires_at: string
          id: string
          purpose: string | null
          updated_at: string
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          code_hash: string
          created_at?: string
          data?: Json | null
          email: string
          expires_at: string
          id?: string
          purpose?: string | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          code_hash?: string
          created_at?: string
          data?: Json | null
          email?: string
          expires_at?: string
          id?: string
          purpose?: string | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string | null
          category: string | null
          created_at: string
          data: Json | null
          id: string
          is_active: boolean | null
          question: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          answer?: string | null
          category?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          question?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          answer?: string | null
          category?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          question?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          data: Json | null
          description: string | null
          enabled: boolean | null
          id: string
          key: string
          rollout_percent: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          key: string
          rollout_percent?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          key?: string
          rollout_percent?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      gift_cards: {
        Row: {
          amount: number | null
          balance: number | null
          code: string
          created_at: string
          data: Json | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          message: string | null
          purchased_by: string | null
          recipient_email: string | null
          recipient_name: string | null
          redeemed_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          balance?: number | null
          code: string
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string | null
          purchased_by?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          balance?: number | null
          code?: string
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string | null
          purchased_by?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      global_reviews: {
        Row: {
          comment: string | null
          created_at: string
          data: Json | null
          id: string
          is_approved: boolean | null
          is_featured: boolean | null
          rating: number | null
          title: string | null
          updated_at: string
          user_avatar: string | null
          user_name: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          rating?: number | null
          title?: string | null
          updated_at?: string
          user_avatar?: string | null
          user_name?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          rating?: number | null
          title?: string | null
          updated_at?: string
          user_avatar?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      gst_purchase_register: {
        Row: {
          cgst: number | null
          created_at: string
          data: Json | null
          id: string
          igst: number | null
          invoice_date: string | null
          invoice_number: string | null
          sgst: number | null
          taxable_amount: number | null
          total: number | null
          updated_at: string
          vendor_gstin: string | null
          vendor_name: string | null
        }
        Insert: {
          cgst?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          igst?: number | null
          invoice_date?: string | null
          invoice_number?: string | null
          sgst?: number | null
          taxable_amount?: number | null
          total?: number | null
          updated_at?: string
          vendor_gstin?: string | null
          vendor_name?: string | null
        }
        Update: {
          cgst?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          igst?: number | null
          invoice_date?: string | null
          invoice_number?: string | null
          sgst?: number | null
          taxable_amount?: number | null
          total?: number | null
          updated_at?: string
          vendor_gstin?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      gst_sales_register: {
        Row: {
          cgst: number | null
          created_at: string
          customer_gstin: string | null
          customer_name: string | null
          data: Json | null
          id: string
          igst: number | null
          invoice_date: string | null
          invoice_number: string | null
          sgst: number | null
          taxable_amount: number | null
          total: number | null
          updated_at: string
        }
        Insert: {
          cgst?: number | null
          created_at?: string
          customer_gstin?: string | null
          customer_name?: string | null
          data?: Json | null
          id?: string
          igst?: number | null
          invoice_date?: string | null
          invoice_number?: string | null
          sgst?: number | null
          taxable_amount?: number | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          cgst?: number | null
          created_at?: string
          customer_gstin?: string | null
          customer_name?: string | null
          data?: Json | null
          id?: string
          igst?: number | null
          invoice_date?: string | null
          invoice_number?: string | null
          sgst?: number | null
          taxable_amount?: number | null
          total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      guardian_points: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          points: number | null
          reason: string | null
          reference_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          points?: number | null
          reason?: string | null
          reference_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          points?: number | null
          reason?: string | null
          reference_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      homepage_config: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_active: boolean | null
          payload: Json | null
          section_key: string | null
          sort_order: number | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          payload?: Json | null
          section_key?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          payload?: Json | null
          section_key?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number | null
          created_at: string
          data: Json | null
          file_url: string | null
          id: string
          invoice_number: string | null
          issued_at: string | null
          order_id: string | null
          tax: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          data?: Json | null
          file_url?: string | null
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          order_id?: string | null
          tax?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          data?: Json | null
          file_url?: string | null
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          order_id?: string | null
          tax?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      login_lockouts: {
        Row: {
          attempts: number | null
          created_at: string
          data: Json | null
          id: string
          identifier: string | null
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          identifier?: string | null
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          identifier?: string | null
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_status: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          lifetime_points: number | null
          points: number | null
          tier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          lifetime_points?: number | null
          points?: number | null
          tier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          lifetime_points?: number | null
          points?: number | null
          tier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff" | "user"
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
      app_role: ["admin", "manager", "staff", "user"],
    },
  },
} as const
