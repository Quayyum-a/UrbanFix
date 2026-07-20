// UrbanFix Database Types - Generated from complete schema implementation
// Supports all 9 tables with full type safety and business constraints

export interface Database {
  public: {
    Tables: {
      user_pins: {
        Row: {
          id: string
          phone: string
          pin_hash: string
          attempts: number
          last_attempt_at: string | null
          locked_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone: string
          pin_hash: string
          attempts?: number
          last_attempt_at?: string | null
          locked_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone?: string
          pin_hash?: string
          attempts?: number
          last_attempt_at?: string | null
          locked_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          phone: string
          role: 'customer' | 'technician' | 'admin'
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          phone: string
          role: 'customer' | 'technician' | 'admin'
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          phone?: string
          role?: 'customer' | 'technician' | 'admin'
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          id: string
          user_id: string
          location: unknown | null // PostGIS GEOMETRY(POINT, 4326)
          address_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          location?: unknown | null
          address_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          location?: unknown | null
          address_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      technician_profiles: {
        Row: {
          id: string
          user_id: string
          nin: string
          nin_doc_url: string | null
          shop_address: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_account_name: string | null
          paystack_recipient_code: string | null
          verification_status: 'pending' | 'approved' | 'rejected'
          rejection_reason: string | null
          is_available: boolean
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          nin: string
          nin_doc_url?: string | null
          shop_address?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_account_name?: string | null
          paystack_recipient_code?: string | null
          verification_status?: 'pending' | 'approved' | 'rejected'
          rejection_reason?: string | null
          is_available?: boolean
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          nin?: string
          nin_doc_url?: string | null
          shop_address?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_account_name?: string | null
          paystack_recipient_code?: string | null
          verification_status?: 'pending' | 'approved' | 'rejected'
          rejection_reason?: string | null
          is_available?: boolean
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          id: string
          customer_id: string
          technician_id: string | null
          device_brand: string
          device_model: string
          repair_category: string
          part_id: string | null
          part_price: number
          labour_price: number
          platform_fee: number
          total_price: number
          payout_amount: number
          photo_urls: string[] | null
          pickup_address: string
          status: 'booked' | 'paid' | 'pickup_scheduled' | 'device_received' | 'repair_started' | 'awaiting_release' | 'disputed' | 'complete' | 'cancelled'
          rider_name: string | null
          rider_phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          customer_id: string
          technician_id?: string | null
          device_brand: string
          device_model: string
          repair_category: string
          part_id?: string | null
          part_price: number
          labour_price: number
          platform_fee: number
          total_price: number
          payout_amount: number
          photo_urls?: string[] | null
          pickup_address: string
          status?: 'booked' | 'paid' | 'pickup_scheduled' | 'device_received' | 'repair_started' | 'awaiting_release' | 'disputed' | 'complete' | 'cancelled'
          rider_name?: string | null
          rider_phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string
          technician_id?: string | null
          device_brand?: string
          device_model?: string
          repair_category?: string
          part_id?: string | null
          part_price?: number
          labour_price?: number
          platform_fee?: number
          total_price?: number
          payout_amount?: number
          photo_urls?: string[] | null
          pickup_address?: string
          status?: 'booked' | 'paid' | 'pickup_scheduled' | 'device_received' | 'repair_started' | 'awaiting_release' | 'disputed' | 'complete' | 'cancelled'
          rider_name?: string | null
          rider_phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          job_id: string
          amount: number
          status: 'pending' | 'escrowed' | 'released' | 'refunded' | 'disputed'
          paystack_ref: string | null
          paystack_transfer_ref: string | null
          escrowed_at: string | null
          released_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          amount: number
          status?: 'pending' | 'escrowed' | 'released' | 'refunded' | 'disputed'
          paystack_ref?: string | null
          paystack_transfer_ref?: string | null
          escrowed_at?: string | null
          released_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          amount?: number
          status?: 'pending' | 'escrowed' | 'released' | 'refunded' | 'disputed'
          paystack_ref?: string | null
          paystack_transfer_ref?: string | null
          escrowed_at?: string | null
          released_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          job_id: string
          sender_id: string
          body: string
          attachment_url: string | null
          sent_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          job_id: string
          sender_id: string
          body: string
          attachment_url?: string | null
          sent_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          job_id?: string
          sender_id?: string
          body?: string
          attachment_url?: string | null
          sent_at?: string
          read_at?: string | null
        }
        Relationships: []
      }
      parts_catalogue: {
        Row: {
          id: string
          device_brand: string
          device_model: string
          repair_category: string
          part_name: string
          part_price: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          device_brand: string
          device_model: string
          repair_category: string
          part_name: string
          part_price: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          device_brand?: string
          device_model?: string
          repair_category?: string
          part_name?: string
          part_price?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      technician_pricing: {
        Row: {
          id: string
          technician_id: string
          repair_category: string
          device_type: string
          labour_price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          technician_id: string
          repair_category: string
          device_type: string
          labour_price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          technician_id?: string
          repair_category?: string
          device_type?: string
          labour_price?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          job_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id: string
          reviewer_id: string
          reviewee_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          reviewer_id?: string
          reviewee_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          table_name: string
          operation: string
          record_id: string | null
          timestamp: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          table_name: string
          operation: string
          record_id?: string | null
          timestamp?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          table_name?: string
          operation?: string
          record_id?: string | null
          timestamp?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      safe_technician_public_profiles: {
        Row: {
          user_id: string
          full_name: string | null
          avatar_url: string | null
          shop_address: string | null
          verification_status: 'pending' | 'approved' | 'rejected'
          is_available: boolean
          avg_rating: number
          completed_jobs: number
        }
        Relationships: []
      }
    }
    Functions: {
      technician_avg_rating: {
        Args: {
          t_user_id: string
        }
        Returns: number
      }
      technician_job_count: {
        Args: {
          t_user_id: string
        }
        Returns: number
      }
      calculate_distance_km: {
        Args: {
          lat1: number
          lon1: number
          lat2: number
          lon2: number
        }
        Returns: number
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: 'customer' | 'technician' | 'admin'
      }
      validate_job_participant: {
        Args: {
          job_uuid: string
        }
        Returns: boolean
      }
      validate_technician_approved: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      rls_performance_check: {
        Args: Record<PropertyKey, never>
        Returns: {
          table_name: string
          policy_count: number
          avg_execution_time: number
        }[]
      }
    }
    Enums: {
      user_role: 'customer' | 'technician' | 'admin'
      verification_status: 'pending' | 'approved' | 'rejected'
      job_status: 'booked' | 'paid' | 'pickup_scheduled' | 'device_received' | 'repair_started' | 'awaiting_release' | 'disputed' | 'complete' | 'cancelled'
      payment_status: 'pending' | 'escrowed' | 'released' | 'refunded' | 'disputed'
    }
  }
}