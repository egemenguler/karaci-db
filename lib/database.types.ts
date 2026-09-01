// Supabase şema tipleri.
//
// Bu dosya normalde ÜRETİLİR:
//
//   npx supabase login          # bir kez
//   npm run types:gen
//
// Şu an elle yazıldı çünkü tip üretimi bir erişim token'ı istiyor.
// Yapısı jeneratörün çıktısıyla aynı, dolayısıyla types:gen ilk kez
// çalıştığında bu dosyayı sorunsuz ezer. Şemayı değiştirdiğinde
// types:gen çalıştır, burayı elle güncelleme.
//
// View kolonlarının hepsi nullable — jeneratör böyle üretiyor, çünkü
// Postgres bir view kolonunun not-null olduğunu garanti etmiyor.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      camp: {
        Row: {
          id: string;
          name: string;
          year: number;
          starts_on: string | null;
          ends_on: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          year: number;
          starts_on?: string | null;
          ends_on?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          year?: number;
          starts_on?: string | null;
          ends_on?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      member: {
        Row: {
          id: string;
          name: string;
          sat_no: string | null;
          joined_year: number | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          sat_no?: string | null;
          joined_year?: number | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          sat_no?: string | null;
          joined_year?: number | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      dive: {
        Row: {
          id: string;
          camp_id: string;
          member_id: string;
          entry_time: string;
          start_pressure: number;
          weight: number;
          tank_size: number;
          tank_material: Database["public"]["Enums"]["tank_material"];
          twin: boolean;
          exit_time: string | null;
          end_pressure: number | null;
          buddy_id: string | null;
          leader_id: string | null;
          max_depth: number | null;
          dive_type: string | null;
          site: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          camp_id: string;
          member_id: string;
          entry_time: string;
          start_pressure: number;
          weight: number;
          tank_size: number;
          tank_material: Database["public"]["Enums"]["tank_material"];
          twin?: boolean;
          exit_time?: string | null;
          end_pressure?: number | null;
          buddy_id?: string | null;
          leader_id?: string | null;
          max_depth?: number | null;
          dive_type?: string | null;
          site?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          camp_id?: string;
          member_id?: string;
          entry_time?: string;
          start_pressure?: number;
          weight?: number;
          tank_size?: number;
          tank_material?: Database["public"]["Enums"]["tank_material"];
          twin?: boolean;
          exit_time?: string | null;
          end_pressure?: number | null;
          buddy_id?: string | null;
          leader_id?: string | null;
          max_depth?: number | null;
          dive_type?: string | null;
          site?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "dive_camp_id_fkey";
            columns: ["camp_id"];
            referencedRelation: "camp";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dive_member_id_fkey";
            columns: ["member_id"];
            referencedRelation: "member";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dive_buddy_id_fkey";
            columns: ["buddy_id"];
            referencedRelation: "member";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dive_leader_id_fkey";
            columns: ["leader_id"];
            referencedRelation: "member";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      active_dive: {
        Row: {
          id: string | null;
          camp_id: string | null;
          member_id: string | null;
          member_name: string | null;
          entry_time: string | null;
          start_pressure: number | null;
          tank_size: number | null;
          tank_material: Database["public"]["Enums"]["tank_material"] | null;
          twin: boolean | null;
          weight: number | null;
          buddy_id: string | null;
          buddy_name: string | null;
          leader_id: string | null;
          leader_name: string | null;
        };
        Relationships: [];
      };
      dive_detail: {
        Row: {
          id: string | null;
          camp_id: string | null;
          member_id: string | null;
          entry_time: string | null;
          start_pressure: number | null;
          weight: number | null;
          tank_size: number | null;
          tank_material: Database["public"]["Enums"]["tank_material"] | null;
          twin: boolean | null;
          exit_time: string | null;
          end_pressure: number | null;
          buddy_id: string | null;
          leader_id: string | null;
          max_depth: number | null;
          dive_type: string | null;
          site: string | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
          deleted_at: string | null;
          member_name: string | null;
          camp_name: string | null;
          camp_year: number | null;
          duration_min: number | null;
          pressure_used: number | null;
          bar_per_min: number | null;
          liters_per_min: number | null;
          sac_rate: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      suggested_weight: {
        Args: {
          p_member_id: string;
          p_tank_material: Database["public"]["Enums"]["tank_material"];
          p_tank_size: number;
          p_twin: boolean;
        };
        Returns: number;
      };
    };
    Enums: {
      tank_material: "aluminum" | "steel";
    };
    CompositeTypes: Record<never, never>;
  };
};
