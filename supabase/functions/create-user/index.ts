import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { full_name, email, password, role, department, qualification, class_id, roll_number, guardian_name, guardian_phone, linked_student_ids } = await req.json();

    if (!full_name || !email || !password || !role) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validRoles = ["PRINCIPAL", "TEACHER", "STUDENT", "PARENT"];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid role" }),
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

    const { data: caller, error: callerError } = await supabaseUser.auth.getUser();
    if (callerError || !caller.user) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get caller's institution
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("institution_id")
      .eq("user_id", caller.user.id)
      .single();

    if (!callerProfile?.institution_id) {
      return new Response(
        JSON.stringify({ success: false, message: "No institution found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check caller has FOUNDER or PRINCIPAL role
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.user.id)
      .eq("institution_id", callerProfile.institution_id);

    const callerRoleNames = callerRoles?.map(r => r.role) || [];
    if (!callerRoleNames.includes("FOUNDER") && !callerRoleNames.includes("PRINCIPAL")) {
      return new Response(
        JSON.stringify({ success: false, message: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ success: false, message: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = newUser.user.id;
    const institutionId = callerProfile.institution_id;

    // Update profile with institution
    await supabaseAdmin
      .from("profiles")
      .update({ institution_id: institutionId, full_name })
      .eq("user_id", newUserId);

    // Assign role
    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newUserId, institution_id: institutionId, role });

    // Create role-specific records
    if (role === "TEACHER") {
      await supabaseAdmin
        .from("teachers")
        .insert({ institution_id: institutionId, user_id: newUserId, department, qualification });
    } else if (role === "STUDENT") {
      await supabaseAdmin
        .from("students")
        .insert({
          institution_id: institutionId,
          user_id: newUserId,
          class_id: class_id || null,
          roll_number,
          guardian_name,
          guardian_phone,
        });
    } else if (role === "PARENT" && linked_student_ids?.length > 0) {
      // Link parent to students
      for (const sid of linked_student_ids) {
        await supabaseAdmin
          .from("students")
          .update({ parent_user_id: newUserId })
          .eq("id", sid)
          .eq("institution_id", institutionId);
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: { user_id: newUserId }, message: `${role} created successfully` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
