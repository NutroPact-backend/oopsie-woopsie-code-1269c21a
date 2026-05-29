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
          notify_count: number | null
          recovered_at: string | null
          recovery_token: string | null
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
          notify_count?: number | null
          recovered_at?: string | null
          recovery_token?: string | null
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
          notify_count?: number | null
          recovered_at?: string | null
          recovery_token?: string | null
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
      analytics_events: {
        Row: {
          channel: string | null
          created_at: string
          data: Json | null
          event_name: string
          event_type: string | null
          id: string
          properties: Json | null
          referrer: string | null
          session_id: string | null
          updated_at: string
          url: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          data?: Json | null
          event_name: string
          event_type?: string | null
          id?: string
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          data?: Json | null
          event_name?: string
          event_type?: string | null
          id?: string
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
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
          published: boolean | null
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
          published?: boolean | null
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
          published?: boolean | null
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
          active: boolean | null
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
          active?: boolean | null
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
          active?: boolean | null
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
          active: boolean | null
          created_at: string
          data: Json | null
          description: string | null
          featured: boolean | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          meta_description: string | null
          meta_title: string | null
          name: string
          parent_id: string | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          slug: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          data?: Json | null
          description?: string | null
          featured?: boolean | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          parent_id?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          data?: Json | null
          description?: string | null
          featured?: boolean | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
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
          active: boolean | null
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
          active?: boolean | null
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
          active?: boolean | null
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
          active: boolean | null
          code: string
          created_at: string
          data: Json | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          label: string | null
          max_discount: number | null
          min_order_value: number | null
          type: string | null
          updated_at: string
          usage_limit: number | null
          used_count: number | null
          valid_from: string | null
          valid_until: string | null
          value: number | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string
          data?: Json | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          label?: string | null
          max_discount?: number | null
          min_order_value?: number | null
          type?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
          value?: number | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string
          data?: Json | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          label?: string | null
          max_discount?: number | null
          min_order_value?: number | null
          type?: string | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
          value?: number | null
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
      experiment_assignments: {
        Row: {
          created_at: string
          data: Json | null
          experiment_id: string | null
          experiment_key: string | null
          id: string
          session_id: string | null
          user_id: string | null
          variant: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          experiment_id?: string | null
          experiment_key?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
          variant?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          experiment_id?: string | null
          experiment_key?: string | null
          id?: string
          session_id?: string | null
          user_id?: string | null
          variant?: string | null
        }
        Relationships: []
      }
      experiments: {
        Row: {
          active: boolean | null
          created_at: string
          data: Json | null
          description: string | null
          ends_at: string | null
          id: string
          key: string
          name: string | null
          starts_at: string | null
          updated_at: string
          variants: Json | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          data?: Json | null
          description?: string | null
          ends_at?: string | null
          id?: string
          key: string
          name?: string | null
          starts_at?: string | null
          updated_at?: string
          variants?: Json | null
        }
        Update: {
          active?: boolean | null
          created_at?: string
          data?: Json | null
          description?: string | null
          ends_at?: string | null
          id?: string
          key?: string
          name?: string | null
          starts_at?: string | null
          updated_at?: string
          variants?: Json | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string | null
          category: string | null
          created_at: string
          data: Json | null
          enabled: boolean | null
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
          enabled?: boolean | null
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
          enabled?: boolean | null
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
          config: Json | null
          created_at: string
          data: Json | null
          id: string
          is_active: boolean | null
          key: string | null
          payload: Json | null
          section_key: string | null
          sort_order: number | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          key?: string | null
          payload?: Json | null
          section_key?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          key?: string | null
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
          emailed_at: string | null
          file_url: string | null
          id: string
          invoice_number: string | null
          issued_at: string | null
          order_id: string | null
          order_number: string | null
          tax: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          data?: Json | null
          emailed_at?: string | null
          file_url?: string | null
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          order_id?: string | null
          order_number?: string | null
          tax?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          data?: Json | null
          emailed_at?: string | null
          file_url?: string | null
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          order_id?: string | null
          order_number?: string | null
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
      loyalty_tiers: {
        Row: {
          badge_url: string | null
          benefits: Json | null
          color: string | null
          created_at: string
          data: Json | null
          id: string
          is_active: boolean | null
          min_points: number | null
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          badge_url?: string | null
          benefits?: Json | null
          color?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          min_points?: number | null
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          badge_url?: string | null
          benefits?: Json | null
          color?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          min_points?: number | null
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      marketing_events: {
        Row: {
          channel: string | null
          created_at: string
          data: Json | null
          event_name: string | null
          event_type: string | null
          id: string
          order_number: string | null
          properties: Json | null
          referrer: string | null
          session_id: string | null
          updated_at: string
          url: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          value: number | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          data?: Json | null
          event_name?: string | null
          event_type?: string | null
          id?: string
          order_number?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value?: number | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          data?: Json | null
          event_name?: string | null
          event_type?: string | null
          id?: string
          order_number?: string | null
          properties?: Json | null
          referrer?: string | null
          session_id?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          value?: number | null
        }
        Relationships: []
      }
      marketing_settings: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          channel: string | null
          created_at: string
          data: Json | null
          id: string
          payload: Json | null
          response: Json | null
          status: string | null
          template: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          payload?: Json | null
          response?: Json | null
          status?: string | null
          template?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          payload?: Json | null
          response?: Json | null
          status?: string | null
          template?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          channel: string | null
          created_at: string
          data: Json | null
          error: string | null
          id: string
          payload: Json | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          template: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          data?: Json | null
          error?: string | null
          id?: string
          payload?: Json | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          template?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          data?: Json | null
          error?: string | null
          id?: string
          payload?: Json | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          template?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          active: boolean | null
          applies_to_flavors: string[] | null
          applies_to_sizes: string[] | null
          badge_label: string | null
          banner_url: string | null
          category_ids: string[] | null
          code: string | null
          created_at: string
          data: Json | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          expires_at: string | null
          free_product_name: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          max_order_value: number | null
          min_amount: number | null
          min_order_value: number | null
          offer_type: string | null
          priority: number | null
          product_ids: string[] | null
          scope_type: string | null
          scope_values: Json | null
          sort_order: number | null
          starts_at: string | null
          subtitle: string | null
          terms: string | null
          title: string
          type: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          value: number | null
        }
        Insert: {
          active?: boolean | null
          applies_to_flavors?: string[] | null
          applies_to_sizes?: string[] | null
          badge_label?: string | null
          banner_url?: string | null
          category_ids?: string[] | null
          code?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_at?: string | null
          free_product_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          max_order_value?: number | null
          min_amount?: number | null
          min_order_value?: number | null
          offer_type?: string | null
          priority?: number | null
          product_ids?: string[] | null
          scope_type?: string | null
          scope_values?: Json | null
          sort_order?: number | null
          starts_at?: string | null
          subtitle?: string | null
          terms?: string | null
          title: string
          type?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          value?: number | null
        }
        Update: {
          active?: boolean | null
          applies_to_flavors?: string[] | null
          applies_to_sizes?: string[] | null
          badge_label?: string | null
          banner_url?: string | null
          category_ids?: string[] | null
          code?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_at?: string | null
          free_product_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          max_order_value?: number | null
          min_amount?: number | null
          min_order_value?: number | null
          offer_type?: string | null
          priority?: number | null
          product_ids?: string[] | null
          scope_type?: string | null
          scope_values?: Json | null
          sort_order?: number | null
          starts_at?: string | null
          subtitle?: string | null
          terms?: string | null
          title?: string
          type?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          value?: number | null
        }
        Relationships: []
      }
      order_modify_requests: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          order_id: string
          payload: Json | null
          reason: string | null
          request_type: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          order_id: string
          payload?: Json | null
          reason?: string | null
          request_type?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          order_id?: string
          payload?: Json | null
          reason?: string | null
          request_type?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_tracking: {
        Row: {
          awb_number: string | null
          courier: string | null
          created_at: string
          data: Json | null
          id: string
          location: string | null
          message: string | null
          order_id: string
          order_number: string | null
          status: string | null
          status_history: Json | null
          tracked_at: string | null
          updated_at: string
        }
        Insert: {
          awb_number?: string | null
          courier?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          location?: string | null
          message?: string | null
          order_id: string
          order_number?: string | null
          status?: string | null
          status_history?: Json | null
          tracked_at?: string | null
          updated_at?: string
        }
        Update: {
          awb_number?: string | null
          courier?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          location?: string | null
          message?: string | null
          order_id?: string
          order_number?: string | null
          status?: string | null
          status_history?: Json | null
          tracked_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          billing_address: Json | null
          cancelled_at: string | null
          coupon_code: string | null
          courier_name: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          data: Json | null
          delivered_at: string | null
          discount: number | null
          id: string
          items: Json | null
          notes: string | null
          order_number: string | null
          order_status: string | null
          payment_id: string | null
          payment_method: string | null
          payment_status: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_charge: number | null
          status: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          cancelled_at?: string | null
          coupon_code?: string | null
          courier_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          data?: Json | null
          delivered_at?: string | null
          discount?: number | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_number?: string | null
          order_status?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_charge?: number | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          cancelled_at?: string | null
          coupon_code?: string | null
          courier_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          data?: Json | null
          delivered_at?: string | null
          discount?: number | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_number?: string | null
          order_status?: string | null
          payment_id?: string | null
          payment_method?: string | null
          payment_status?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_charge?: number | null
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      packaging_boxes: {
        Row: {
          cost: number | null
          created_at: string
          data: Json | null
          height: number | null
          id: string
          is_active: boolean | null
          length: number | null
          max_weight: number | null
          name: string
          updated_at: string
          weight: number | null
          width: number | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          data?: Json | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          length?: number | null
          max_weight?: number | null
          name: string
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          data?: Json | null
          height?: number | null
          id?: string
          is_active?: boolean | null
          length?: number | null
          max_weight?: number | null
          name?: string
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Relationships: []
      }
      page_backgrounds: {
        Row: {
          background_type: string | null
          background_value: string | null
          created_at: string
          data: Json | null
          id: string
          is_active: boolean | null
          page_key: string | null
          updated_at: string
        }
        Insert: {
          background_type?: string | null
          background_value?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          page_key?: string | null
          updated_at?: string
        }
        Update: {
          background_type?: string | null
          background_value?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          page_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_offers: {
        Row: {
          active: boolean | null
          badge_label: string | null
          banks: string[] | null
          cards: string[] | null
          code: string | null
          created_at: string
          data: Json | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          id: string
          is_active: boolean | null
          link: string | null
          logo: string | null
          max_cashback: number | null
          max_discount: number | null
          min_amount: number | null
          payment_methods: string[] | null
          provider: string | null
          sort_order: number | null
          terms: string | null
          title: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          active?: boolean | null
          badge_label?: string | null
          banks?: string[] | null
          cards?: string[] | null
          code?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          link?: string | null
          logo?: string | null
          max_cashback?: number | null
          max_discount?: number | null
          min_amount?: number | null
          payment_methods?: string[] | null
          provider?: string | null
          sort_order?: number | null
          terms?: string | null
          title: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          active?: boolean | null
          badge_label?: string | null
          banks?: string[] | null
          cards?: string[] | null
          code?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          link?: string | null
          logo?: string | null
          max_cashback?: number | null
          max_discount?: number | null
          min_amount?: number | null
          payment_methods?: string[] | null
          provider?: string | null
          sort_order?: number | null
          terms?: string | null
          title?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          data: Json | null
          id: string
          order_id: string | null
          payload: Json | null
          payment_method: string | null
          provider: string | null
          provider_txn_id: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          data?: Json | null
          id?: string
          order_id?: string | null
          payload?: Json | null
          payment_method?: string | null
          provider?: string | null
          provider_txn_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          data?: Json | null
          id?: string
          order_id?: string | null
          payload?: Json | null
          payment_method?: string | null
          provider?: string | null
          provider_txn_id?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      permission_audit_log: {
        Row: {
          action: string | null
          admin_id: string | null
          created_at: string
          data: Json | null
          id: string
          payload: Json | null
          permission_key: string | null
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          action?: string | null
          admin_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          payload?: Json | null
          permission_key?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          action?: string | null
          admin_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          payload?: Json | null
          permission_key?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string | null
          created_at: string
          data: Json | null
          description: string | null
          id: string
          key: string
          name: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          key: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          key?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          attempts: number | null
          code_hash: string
          created_at: string
          data: Json | null
          expires_at: string
          id: string
          phone: string
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
          expires_at: string
          id?: string
          phone: string
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
          expires_at?: string
          id?: string
          phone?: string
          purpose?: string | null
          updated_at?: string
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      product_auth_checkpoints: {
        Row: {
          checkpoint_type: string | null
          code_id: string | null
          created_at: string
          data: Json | null
          id: string
          location: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          checkpoint_type?: string | null
          code_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          location?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          checkpoint_type?: string | null
          code_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          location?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_auth_codes: {
        Row: {
          batch: string | null
          code: string
          created_at: string
          data: Json | null
          first_scanned_at: string | null
          id: string
          is_used: boolean | null
          product_id: string | null
          scanned_count: number | null
          serial_number: string | null
          updated_at: string
        }
        Insert: {
          batch?: string | null
          code: string
          created_at?: string
          data?: Json | null
          first_scanned_at?: string | null
          id?: string
          is_used?: boolean | null
          product_id?: string | null
          scanned_count?: number | null
          serial_number?: string | null
          updated_at?: string
        }
        Update: {
          batch?: string | null
          code?: string
          created_at?: string
          data?: Json | null
          first_scanned_at?: string | null
          id?: string
          is_used?: boolean | null
          product_id?: string | null
          scanned_count?: number | null
          serial_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_auth_distributors: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          data: Json | null
          id: string
          is_authorized: boolean | null
          name: string
          notes: string | null
          region: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_authorized?: boolean | null
          name: string
          notes?: string | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_authorized?: boolean | null
          name?: string
          notes?: string | null
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_auth_legal_cases: {
        Row: {
          case_number: string | null
          created_at: string
          data: Json | null
          defendant: string | null
          description: string | null
          documents: Json | null
          filed_at: string | null
          id: string
          resolved_at: string | null
          status: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          case_number?: string | null
          created_at?: string
          data?: Json | null
          defendant?: string | null
          description?: string | null
          documents?: Json | null
          filed_at?: string | null
          id?: string
          resolved_at?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          case_number?: string | null
          created_at?: string
          data?: Json | null
          defendant?: string | null
          description?: string | null
          documents?: Json | null
          filed_at?: string | null
          id?: string
          resolved_at?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_auth_marketplace_listings: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_authorized: boolean | null
          listing_url: string | null
          marketplace: string
          price: number | null
          product_name: string | null
          seller_name: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_authorized?: boolean | null
          listing_url?: string | null
          marketplace: string
          price?: number | null
          product_name?: string | null
          seller_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_authorized?: boolean | null
          listing_url?: string | null
          marketplace?: string
          price?: number | null
          product_name?: string | null
          seller_name?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_auth_reports: {
        Row: {
          code: string | null
          created_at: string
          data: Json | null
          description: string | null
          evidence: Json | null
          id: string
          product_name: string | null
          purchase_source: string | null
          reporter_email: string | null
          reporter_name: string | null
          reporter_phone: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          evidence?: Json | null
          id?: string
          product_name?: string | null
          purchase_source?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          evidence?: Json | null
          id?: string
          product_name?: string | null
          purchase_source?: string | null
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_auth_scans: {
        Row: {
          code: string | null
          code_id: string | null
          created_at: string
          data: Json | null
          id: string
          ip: string | null
          is_genuine: boolean | null
          location: Json | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          code?: string | null
          code_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          ip?: string | null
          is_genuine?: boolean | null
          location?: Json | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          code?: string | null
          code_id?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          ip?: string | null
          is_genuine?: boolean | null
          location?: Json | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_cooccurrence: {
        Row: {
          count: number | null
          created_at: string
          data: Json | null
          id: string
          product_id: string
          related_product_id: string
          score: number | null
          updated_at: string
        }
        Insert: {
          count?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          product_id: string
          related_product_id: string
          score?: number | null
          updated_at?: string
        }
        Update: {
          count?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          product_id?: string
          related_product_id?: string
          score?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      product_flavors: {
        Row: {
          active: boolean | null
          created_at: string
          data: Json | null
          description: string | null
          hex_color: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price_adjustment: number | null
          product_id: string
          slug: string | null
          sort_order: number | null
          stock: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          data?: Json | null
          description?: string | null
          hex_color?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price_adjustment?: number | null
          product_id: string
          slug?: string | null
          sort_order?: number | null
          stock?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          data?: Json | null
          description?: string | null
          hex_color?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price_adjustment?: number | null
          product_id?: string
          slug?: string | null
          sort_order?: number | null
          stock?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      product_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          created_at: string
          data: Json | null
          helpful_count: number | null
          id: string
          is_approved: boolean | null
          product_id: string
          question: string
          updated_at: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          data?: Json | null
          helpful_count?: number | null
          id?: string
          is_approved?: boolean | null
          product_id: string
          question: string
          updated_at?: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          data?: Json | null
          helpful_count?: number | null
          id?: string
          is_approved?: boolean | null
          product_id?: string
          question?: string
          updated_at?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          data: Json | null
          helpful_count: number | null
          id: string
          images: Json | null
          is_approved: boolean | null
          is_verified: boolean | null
          order_id: string | null
          product_id: string
          rating: number
          title: string | null
          updated_at: string
          user_avatar: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          data?: Json | null
          helpful_count?: number | null
          id?: string
          images?: Json | null
          is_approved?: boolean | null
          is_verified?: boolean | null
          order_id?: string | null
          product_id: string
          rating: number
          title?: string | null
          updated_at?: string
          user_avatar?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          data?: Json | null
          helpful_count?: number | null
          id?: string
          images?: Json | null
          is_approved?: boolean | null
          is_verified?: boolean | null
          order_id?: string | null
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_avatar?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      product_sizes: {
        Row: {
          active: boolean | null
          compare_price: number | null
          created_at: string
          data: Json | null
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          product_id: string
          size_value: string | null
          slug: string | null
          sort_order: number | null
          stock: number | null
          updated_at: string
          value_grams: number | null
          weight: number | null
        }
        Insert: {
          active?: boolean | null
          compare_price?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          product_id: string
          size_value?: string | null
          slug?: string | null
          sort_order?: number | null
          stock?: number | null
          updated_at?: string
          value_grams?: number | null
          weight?: number | null
        }
        Update: {
          active?: boolean | null
          compare_price?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          product_id?: string
          size_value?: string | null
          slug?: string | null
          sort_order?: number | null
          stock?: number | null
          updated_at?: string
          value_grams?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      product_translations: {
        Row: {
          created_at: string
          data: Json | null
          description: string | null
          id: string
          language: string
          name: string | null
          product_id: string
          short_description: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          language: string
          name?: string | null
          product_id: string
          short_description?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          language?: string
          name?: string | null
          product_id?: string
          short_description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          active: boolean | null
          attributes: Json | null
          barcode: string | null
          compare_price: number | null
          created_at: string
          data: Json | null
          flavor_id: string | null
          flavor_name: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_default: boolean | null
          low_stock_threshold: number | null
          name: string | null
          price: number | null
          product_id: string
          size_id: string | null
          size_name: string | null
          sku: string | null
          sort_order: number | null
          stock: number | null
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          active?: boolean | null
          attributes?: Json | null
          barcode?: string | null
          compare_price?: number | null
          created_at?: string
          data?: Json | null
          flavor_id?: string | null
          flavor_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          low_stock_threshold?: number | null
          name?: string | null
          price?: number | null
          product_id: string
          size_id?: string | null
          size_name?: string | null
          sku?: string | null
          sort_order?: number | null
          stock?: number | null
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          active?: boolean | null
          attributes?: Json | null
          barcode?: string | null
          compare_price?: number | null
          created_at?: string
          data?: Json | null
          flavor_id?: string | null
          flavor_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          low_stock_threshold?: number | null
          name?: string | null
          price?: number | null
          product_id?: string
          size_id?: string | null
          size_name?: string | null
          sku?: string | null
          sort_order?: number | null
          stock?: number | null
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: []
      }
      product_waitlist: {
        Row: {
          created_at: string
          data: Json | null
          email: string | null
          id: string
          notified_at: string | null
          phone: string | null
          product_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          email?: string | null
          id?: string
          notified_at?: string | null
          phone?: string | null
          product_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          email?: string | null
          id?: string
          notified_at?: string | null
          phone?: string | null
          product_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          benefits: Json | null
          brand_id: string | null
          category_id: string | null
          compare_price: number | null
          cost_price: number | null
          created_at: string
          data: Json | null
          description: string | null
          features: Json | null
          gst_rate: number | null
          hsn_code: string | null
          id: string
          images: Json | null
          ingredients: string | null
          is_active: boolean | null
          is_bestseller: boolean | null
          is_featured: boolean | null
          is_new: boolean | null
          low_stock_threshold: number | null
          meta_description: string | null
          meta_title: string | null
          name: string
          price: number | null
          rating: number | null
          review_count: number | null
          short_description: string | null
          sku: string | null
          slug: string | null
          sort_order: number | null
          stock: number | null
          tags: string[] | null
          updated_at: string
          usage_instructions: string | null
          video_url: string | null
          view_count: number | null
          warnings: string | null
          weight: number | null
        }
        Insert: {
          benefits?: Json | null
          brand_id?: string | null
          category_id?: string | null
          compare_price?: number | null
          cost_price?: number | null
          created_at?: string
          data?: Json | null
          description?: string | null
          features?: Json | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          images?: Json | null
          ingredients?: string | null
          is_active?: boolean | null
          is_bestseller?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          low_stock_threshold?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          price?: number | null
          rating?: number | null
          review_count?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          sort_order?: number | null
          stock?: number | null
          tags?: string[] | null
          updated_at?: string
          usage_instructions?: string | null
          video_url?: string | null
          view_count?: number | null
          warnings?: string | null
          weight?: number | null
        }
        Update: {
          benefits?: Json | null
          brand_id?: string | null
          category_id?: string | null
          compare_price?: number | null
          cost_price?: number | null
          created_at?: string
          data?: Json | null
          description?: string | null
          features?: Json | null
          gst_rate?: number | null
          hsn_code?: string | null
          id?: string
          images?: Json | null
          ingredients?: string | null
          is_active?: boolean | null
          is_bestseller?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          low_stock_threshold?: number | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          price?: number | null
          rating?: number | null
          review_count?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string | null
          sort_order?: number | null
          stock?: number | null
          tags?: string[] | null
          updated_at?: string
          usage_instructions?: string | null
          video_url?: string | null
          view_count?: number | null
          warnings?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          data: Json | null
          date_of_birth: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          marketing_opt_in: boolean | null
          name: string | null
          phone: string | null
          preferences: Json | null
          referral_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          data?: Json | null
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          marketing_opt_in?: boolean | null
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          referral_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          data?: Json | null
          date_of_birth?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          marketing_opt_in?: boolean | null
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          referral_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          name: string | null
          product_id: string | null
          purchase_id: string
          quantity: number | null
          total: number | null
          unit_price: number | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          name?: string | null
          product_id?: string | null
          purchase_id: string
          quantity?: number | null
          total?: number | null
          unit_price?: number | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          name?: string | null
          product_id?: string | null
          purchase_id?: string
          quantity?: number | null
          total?: number | null
          unit_price?: number | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          cgst: number | null
          created_at: string
          data: Json | null
          id: string
          igst: number | null
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          purchase_number: string | null
          sgst: number | null
          status: string | null
          supplier_gstin: string | null
          supplier_name: string | null
          supplier_state_code: string | null
          tax: number | null
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
          notes?: string | null
          purchase_number?: string | null
          sgst?: number | null
          status?: string | null
          supplier_gstin?: string | null
          supplier_name?: string | null
          supplier_state_code?: string | null
          tax?: number | null
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
          notes?: string | null
          purchase_number?: string | null
          sgst?: number | null
          status?: string | null
          supplier_gstin?: string | null
          supplier_name?: string | null
          supplier_state_code?: string | null
          tax?: number | null
          taxable_amount?: number | null
          total?: number | null
          updated_at?: string
          vendor_gstin?: string | null
          vendor_name?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          data: Json | null
          endpoint: string
          id: string
          is_active: boolean | null
          p256dh: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth?: string | null
          created_at?: string
          data?: Json | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          p256dh?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string | null
          created_at?: string
          data?: Json | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          p256dh?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      quick_checkout_methods: {
        Row: {
          created_at: string
          data: Json | null
          details: Json | null
          id: string
          is_default: boolean | null
          label: string | null
          method_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          details?: Json | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          method_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          details?: Json | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          method_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          data: Json | null
          id: string
          is_active: boolean | null
          rewards_earned: number | null
          updated_at: string
          user_id: string
          uses_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          rewards_earned?: number | null
          updated_at?: string
          user_id: string
          uses_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          rewards_earned?: number | null
          updated_at?: string
          user_id?: string
          uses_count?: number | null
        }
        Relationships: []
      }
      referral_events: {
        Row: {
          created_at: string
          data: Json | null
          event_type: string | null
          id: string
          payload: Json | null
          referral_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          referral_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          referral_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string | null
          created_at: string
          data: Json | null
          id: string
          referred_email: string | null
          referred_id: string | null
          referred_phone: string | null
          referrer_id: string
          reward_amount: number | null
          rewarded_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          referred_email?: string | null
          referred_id?: string | null
          referred_phone?: string | null
          referrer_id: string
          reward_amount?: number | null
          rewarded_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          referred_email?: string | null
          referred_id?: string | null
          referred_phone?: string | null
          referrer_id?: string
          reward_amount?: number | null
          rewarded_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      return_requests: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          items: Json | null
          notes: string | null
          order_id: string
          order_number: string | null
          pickup_address: Json | null
          pickup_date: string | null
          reason: string | null
          refund_amount: number | null
          refund_status: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_id: string
          order_number?: string | null
          pickup_address?: Json | null
          pickup_date?: string | null
          reason?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          items?: Json | null
          notes?: string | null
          order_id?: string
          order_number?: string | null
          pickup_address?: Json | null
          pickup_date?: string | null
          reason?: string | null
          refund_amount?: number | null
          refund_status?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      role_default_permissions: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          data: Json | null
          event_type: string | null
          id: string
          ip: string | null
          payload: Json | null
          severity: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          event_type?: string | null
          id?: string
          ip?: string | null
          payload?: Json | null
          severity?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          event_type?: string | null
          id?: string
          ip?: string | null
          payload?: Json | null
          severity?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seo_audit_issues: {
        Row: {
          audit_run_id: string | null
          category: string | null
          created_at: string
          data: Json | null
          description: string | null
          id: string
          recommendation: string | null
          severity: string | null
          title: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          audit_run_id?: string | null
          category?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          recommendation?: string | null
          severity?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          audit_run_id?: string | null
          category?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          recommendation?: string | null
          severity?: string | null
          title?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      seo_audit_runs: {
        Row: {
          created_at: string
          data: Json | null
          finished_at: string | null
          id: string
          score: number | null
          started_at: string | null
          status: string | null
          summary: Json | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          finished_at?: string | null
          id?: string
          score?: number | null
          started_at?: string | null
          status?: string | null
          summary?: Json | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          finished_at?: string | null
          id?: string
          score?: number | null
          started_at?: string | null
          status?: string | null
          summary?: Json | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      seo_backlink_opportunities: {
        Row: {
          authority_score: number | null
          created_at: string
          data: Json | null
          domain: string
          id: string
          notes: string | null
          status: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          authority_score?: number | null
          created_at?: string
          data?: Json | null
          domain: string
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          authority_score?: number | null
          created_at?: string
          data?: Json | null
          domain?: string
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      seo_competitors: {
        Row: {
          created_at: string
          data: Json | null
          domain: string
          id: string
          is_active: boolean | null
          name: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          domain: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          domain?: string
          id?: string
          is_active?: boolean | null
          name?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_gsc_daily: {
        Row: {
          clicks: number | null
          created_at: string
          ctr: number | null
          data: Json | null
          date: string
          id: string
          impressions: number | null
          position: number | null
          query: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          data?: Json | null
          date: string
          id?: string
          impressions?: number | null
          position?: number | null
          query?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          clicks?: number | null
          created_at?: string
          ctr?: number | null
          data?: Json | null
          date?: string
          id?: string
          impressions?: number | null
          position?: number | null
          query?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      seo_insights: {
        Row: {
          created_at: string
          data: Json | null
          description: string | null
          id: string
          is_resolved: boolean | null
          payload: Json | null
          severity: string | null
          title: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          payload?: Json | null
          severity?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          payload?: Json | null
          severity?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_internal_link_suggestions: {
        Row: {
          anchor_text: string | null
          created_at: string
          data: Json | null
          id: string
          is_applied: boolean | null
          reason: string | null
          source_url: string | null
          target_url: string | null
          updated_at: string
        }
        Insert: {
          anchor_text?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_applied?: boolean | null
          reason?: string | null
          source_url?: string | null
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          anchor_text?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_applied?: boolean | null
          reason?: string | null
          source_url?: string | null
          target_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_keyword_history: {
        Row: {
          checked_at: string | null
          created_at: string
          data: Json | null
          id: string
          keyword: string | null
          keyword_id: string | null
          position: number | null
          updated_at: string
          url: string | null
        }
        Insert: {
          checked_at?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          keyword?: string | null
          keyword_id?: string | null
          position?: number | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          checked_at?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          keyword?: string | null
          keyword_id?: string | null
          position?: number | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      seo_page_meta: {
        Row: {
          canonical_url: string | null
          created_at: string
          data: Json | null
          description: string | null
          id: string
          keywords: string[] | null
          og_image: string | null
          page_path: string
          schema_jsonld: Json | null
          title: string | null
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          og_image?: string | null
          page_path: string
          schema_jsonld?: Json | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          keywords?: string[] | null
          og_image?: string | null
          page_path?: string
          schema_jsonld?: Json | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_tracked_keywords: {
        Row: {
          best_position: number | null
          created_at: string
          current_position: number | null
          data: Json | null
          difficulty: number | null
          id: string
          is_active: boolean | null
          keyword: string
          search_volume: number | null
          updated_at: string
          url: string | null
        }
        Insert: {
          best_position?: number | null
          created_at?: string
          current_position?: number | null
          data?: Json | null
          difficulty?: number | null
          id?: string
          is_active?: boolean | null
          keyword: string
          search_volume?: number | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          best_position?: number | null
          created_at?: string
          current_position?: number | null
          data?: Json | null
          difficulty?: number | null
          id?: string
          is_active?: boolean | null
          keyword?: string
          search_volume?: number | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      shipment_automation_runs: {
        Row: {
          created_at: string
          data: Json | null
          finished_at: string | null
          id: string
          payload: Json | null
          run_key: string | null
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
          run_key?: string | null
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
          run_key?: string | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shipment_charges: {
        Row: {
          base_charge: number | null
          cod_charge: number | null
          courier: string | null
          created_at: string
          data: Json | null
          id: string
          is_active: boolean | null
          max_weight: number | null
          min_weight: number | null
          name: string | null
          per_kg: number | null
          updated_at: string
          zone: string | null
        }
        Insert: {
          base_charge?: number | null
          cod_charge?: number | null
          courier?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          max_weight?: number | null
          min_weight?: number | null
          name?: string | null
          per_kg?: number | null
          updated_at?: string
          zone?: string | null
        }
        Update: {
          base_charge?: number | null
          cod_charge?: number | null
          courier?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          max_weight?: number | null
          min_weight?: number | null
          name?: string | null
          per_kg?: number | null
          updated_at?: string
          zone?: string | null
        }
        Relationships: []
      }
      site_events: {
        Row: {
          created_at: string
          data: Json | null
          event_name: string | null
          id: string
          properties: Json | null
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          event_name?: string | null
          id?: string
          properties?: Json | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          event_name?: string | null
          id?: string
          properties?: Json | null
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          category: string | null
          created_at: string
          data: Json | null
          description: string | null
          id: string
          key: string
          settings: Json | null
          updated_at: string
          value: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          key: string
          settings?: Json | null
          updated_at?: string
          value?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          key?: string
          settings?: Json | null
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          data: Json | null
          duration: number | null
          id: string
          ip: string | null
          path: string | null
          referrer: string | null
          session_id: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          data?: Json | null
          duration?: number | null
          id?: string
          ip?: string | null
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          data?: Json | null
          duration?: number | null
          id?: string
          ip?: string | null
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          performed_by: string | null
          product_id: string | null
          quantity: number | null
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          type: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          performed_by?: string | null
          product_id?: string | null
          quantity?: number | null
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          performed_by?: string | null
          product_id?: string | null
          quantity?: number | null
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: []
      }
      subscription_orders: {
        Row: {
          created_at: string
          data: Json | null
          fulfilled_at: string | null
          id: string
          order_id: string | null
          scheduled_for: string | null
          status: string | null
          subscription_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          fulfilled_at?: string | null
          id?: string
          order_id?: string | null
          scheduled_for?: string | null
          status?: string | null
          subscription_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          fulfilled_at?: string | null
          id?: string
          order_id?: string | null
          scheduled_for?: string | null
          status?: string | null
          subscription_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          data: Json | null
          frequency: string | null
          id: string
          next_delivery_at: string | null
          plan: string | null
          product_id: string | null
          quantity: number | null
          shipping_address: Json | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          frequency?: string | null
          id?: string
          next_delivery_at?: string | null
          plan?: string | null
          product_id?: string | null
          quantity?: number | null
          shipping_address?: Json | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          frequency?: string | null
          id?: string
          next_delivery_at?: string | null
          plan?: string | null
          product_id?: string | null
          quantity?: number | null
          shipping_address?: Json | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          comment: string | null
          created_at: string
          data: Json | null
          id: string
          is_approved: boolean | null
          is_featured: boolean | null
          rating: number | null
          show_on_home: boolean | null
          show_on_testimonials: boolean | null
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
          show_on_home?: boolean | null
          show_on_testimonials?: boolean | null
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
          show_on_home?: boolean | null
          show_on_testimonials?: boolean | null
          title?: string | null
          updated_at?: string
          user_avatar?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      urgency_widgets: {
        Row: {
          active: boolean | null
          animation: string | null
          config: Json | null
          created_at: string
          data: Json | null
          exclude_product_ids: string[] | null
          id: string
          include_product_ids: string[] | null
          is_active: boolean | null
          label_template: string | null
          message_template: string | null
          min_to_show: number | null
          name: string | null
          sort_order: number | null
          updated_at: string
          widget_type: string | null
          window_hours: number | null
        }
        Insert: {
          active?: boolean | null
          animation?: string | null
          config?: Json | null
          created_at?: string
          data?: Json | null
          exclude_product_ids?: string[] | null
          id?: string
          include_product_ids?: string[] | null
          is_active?: boolean | null
          label_template?: string | null
          message_template?: string | null
          min_to_show?: number | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string
          widget_type?: string | null
          window_hours?: number | null
        }
        Update: {
          active?: boolean | null
          animation?: string | null
          config?: Json | null
          created_at?: string
          data?: Json | null
          exclude_product_ids?: string[] | null
          id?: string
          include_product_ids?: string[] | null
          is_active?: boolean | null
          label_template?: string | null
          message_template?: string | null
          min_to_show?: number | null
          name?: string | null
          sort_order?: number | null
          updated_at?: string
          widget_type?: string | null
          window_hours?: number | null
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          address_type: string | null
          alternate_phone: string | null
          city: string | null
          country: string | null
          created_at: string
          data: Json | null
          email: string | null
          full_name: string | null
          id: string
          is_default: boolean | null
          label: string | null
          landmark: string | null
          phone: string | null
          pincode: string | null
          state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          address_type?: string | null
          alternate_phone?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          data?: Json | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          landmark?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          address_type?: string | null
          alternate_phone?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          data?: Json | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          landmark?: string | null
          phone?: string | null
          pincode?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_coupons: {
        Row: {
          code: string | null
          coupon_id: string | null
          created_at: string
          data: Json | null
          expires_at: string | null
          id: string
          updated_at: string
          used_at: string | null
          used_count: number | null
          user_id: string
        }
        Insert: {
          code?: string | null
          coupon_id?: string | null
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          updated_at?: string
          used_at?: string | null
          used_count?: number | null
          user_id: string
        }
        Update: {
          code?: string | null
          coupon_id?: string | null
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          updated_at?: string
          used_at?: string | null
          used_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          link: string | null
          read_at: string | null
          title: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          read_at?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          read_at?: string | null
          title?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          data: Json | null
          granted: boolean | null
          granted_by: string | null
          id: string
          permission_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          granted?: boolean | null
          granted_by?: string | null
          id?: string
          permission_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          granted?: boolean | null
          granted_by?: string | null
          id?: string
          permission_key?: string
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
      user_wallets: {
        Row: {
          balance: number | null
          created_at: string
          data: Json | null
          id: string
          lifetime_credit: number | null
          lifetime_debit: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          lifetime_credit?: number | null
          lifetime_debit?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          lifetime_credit?: number | null
          lifetime_debit?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      utm_campaigns: {
        Row: {
          campaign: string | null
          clicks: number | null
          conversions: number | null
          created_at: string
          data: Json | null
          id: string
          is_active: boolean | null
          medium: string | null
          name: string | null
          revenue: number | null
          source: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          campaign?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          medium?: string | null
          name?: string | null
          revenue?: number | null
          source?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          campaign?: string | null
          clicks?: number | null
          conversions?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          medium?: string | null
          name?: string | null
          revenue?: number | null
          source?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      video_sections: {
        Row: {
          created_at: string
          data: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          page_key: string | null
          sort_order: number | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          page_key?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          page_key?: string | null
          sort_order?: number | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      wallet_rules: {
        Row: {
          config: Json | null
          created_at: string
          data: Json | null
          id: string
          is_active: boolean | null
          name: string | null
          rule_type: string | null
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          rule_type?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          rule_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          data: Json | null
          id: string
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          data?: Json | null
          id?: string
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_channels: {
        Row: {
          api_key: string | null
          config: Json | null
          created_at: string
          data: Json | null
          id: string
          is_active: boolean | null
          name: string | null
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          config?: Json | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          config?: Json | null
          created_at?: string
          data?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string | null
          phone_number?: string | null
          updated_at?: string
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
