import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { role, institution_token, full_name, email, subject, class_name, section, phone, department } = await req.json();

    if (!role || !institution_token || !full_name || !email) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["TEACHER", "STUDENT", "STAFF"].includes(role)) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid role. Must be TEACHER, STUDENT, or STAFF" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify caller
    const { data: caller, error: callerError } = await supabaseUser.auth.getUser();
    if (callerError || !caller.user) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = caller.user.id;

    // Verify institution token
    const { data: institution } = await supabaseAdmin
      .from("institutions")
      .select("id, name")
      .eq("token", institution_token)
      .single();

    if (!institution) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid institution token. Please check with your institution administrator." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const institutionId = institution.id;

    // Check if user already has a role in this institution
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("institution_id", institutionId)
      .single();

    if (existingRole) {
      return new Response(
        JSON.stringify({ success: false, message: "You are already registered with this institution." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile with institution
    await supabaseAdmin
      .from("profiles")
      .update({ institution_id: institutionId, full_name })
      .eq("user_id", userId);

    // Assign role
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, institution_id: institutionId, role });

    // Create role-specific records
    if (role === "TEACHER") {
      await supabaseAdmin
        .from("teachers")
        .insert({ institution_id: institutionId, user_id: userId, department: subject || null });
    } else if (role === "STUDENT") {
      // Find or skip class assignment
      let classId = null;
      if (class_name) {
        const { data: cls } = await supabaseAdmin
          .from("classes")
          .select("id")
          .eq("institution_id", institutionId)
          .eq("class_name", class_name)
          .maybeSingle();
        classId = cls?.id || null;
      }

      // Generate registration number
      const { count } = await supabaseAdmin
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("institution_id", institutionId);

      const regNum = `STU${new Date().getFullYear()}${String((count || 0) + 1).padStart(4, "0")}`;

      await supabaseAdmin
        .from("students")
        .insert({
          institution_id: institutionId,
          user_id: userId,
          class_id: classId,
          section: section || null,
          roll_number: regNum,
          guardian_phone: phone || null,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { institution_id: institutionId, institution_name: institution.name },
        message: `Successfully registered as ${role} at ${institution.name}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
