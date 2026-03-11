import React, { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const STARTER_PLAN_TEMPLATES = [
  { name: 'Home Health Annual Mandatory Education', business_line_scope: 'home_health', description: 'Required annual education bundle for home health staff.' },
  { name: 'Hospice Annual Mandatory Education', business_line_scope: 'hospice', description: 'Required annual education bundle for hospice staff.' },
  { name: 'Office Staff Annual Mandatory Education', business_line_scope: 'all', description: 'Required annual education bundle for office and administrative staff.' },
  { name: 'New Hire Orientation', business_line_scope: 'all', description: 'Orientation bundle for newly hired team members.' },
];

export default function AnnualLearningPlanPanel({ plans = [], courses = [], year, onRefresh }) {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [planDraft, setPlanDraft] = useState({ name: `${year} Annual Mandatory Education`, business_line_scope: "all", description: "Annual education bundle" });
  const [selectedCourses, setSelectedCourses] = useState([]);

  const annualPlans = useMemo(() => plans.filter((plan) => plan.plan_type === 'annual'), [plans]);
  const selectedPlan = annualPlans.find((plan) => plan.id === selectedPlanId);

  const createPlan = async () => {
    const created = await base44.entities.LearningPlan.create({
      name: planDraft.name,
      description: planDraft.description,
      business_line_scope: planDraft.business_line_scope,
      year,
      plan_type: 'annual',
      active: true,
      auto_enroll: false,
      auto_enroll_criteria: {},
      total_courses: 0
    });
    setSelectedPlanId(created.id);
    await onRefresh();
  };

  const savePlanCourses = async () => {
    if (!selectedPlan) return;
    const existing = await base44.entities.LearningPlanCourse.filter({ plan_id: selectedPlan.id }, 'order_index', 200);
    await Promise.all(existing.map((item) => base44.entities.LearningPlanCourse.delete(item.id)));
    await Promise.all(selectedCourses.map((courseId, index) => {
      const course = courses.find((item) => item.id === courseId);
      return base44.entities.LearningPlanCourse.create({
        plan_id: selectedPlan.id,
        course_id: courseId,
        course_title: course?.title,
        order_index: index,
        is_required: true
      });
    }));
    await base44.entities.LearningPlan.update(selectedPlan.id, { total_courses: selectedCourses.length });
    queryClient.invalidateQueries({ queryKey: ['annual-plan-courses', selectedPlan.id] });
  };

  const createStarterPlan = async (template) => {
    const created = await base44.entities.LearningPlan.create({
      name: `${year} ${template.name}`,
      description: template.description,
      business_line_scope: template.business_line_scope,
      year,
      plan_type: 'annual',
      active: true,
      auto_enroll: false,
      auto_enroll_criteria: {},
      total_courses: 0
    });
    setSelectedPlanId(created.id);
    await onRefresh();
  };

  const duplicatePlan = async () => {
    if (!selectedPlan) return;
    const created = await base44.entities.LearningPlan.create({
      name: `${selectedPlan.name} (Copy)`,
      description: selectedPlan.description,
      business_line_scope: selectedPlan.business_line_scope,
      year,
      plan_type: 'annual',
      active: true,
      auto_enroll: selectedPlan.auto_enroll || false,
      auto_enroll_criteria: selectedPlan.auto_enroll_criteria || {},
      total_courses: selectedPlan.total_courses || 0
    });
    const items = await base44.entities.LearningPlanCourse.filter({ plan_id: selectedPlan.id }, 'order_index', 200);
    await Promise.all(items.map((item, index) => base44.entities.LearningPlanCourse.create({
      plan_id: created.id,
      course_id: item.course_id,
      course_title: item.course_title,
      order_index: index,
      is_required: item.is_required
    })));
    await base44.entities.LearningPlan.update(created.id, { total_courses: items.length });
    setSelectedPlanId(created.id);
    await onRefresh();
  };

  const toggleCourse = (courseId) => {
    setSelectedCourses((prev) => prev.includes(courseId) ? prev.filter((item) => item !== courseId) : [...prev, courseId]);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Annual learning plans</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-2">
            {STARTER_PLAN_TEMPLATES.map((template) => (
              <Button key={template.name} variant="outline" className="justify-start" onClick={() => createStarterPlan(template)}>
                {template.name}
              </Button>
            ))}
          </div>
          <Input value={planDraft.name} onChange={(e) => setPlanDraft({ ...planDraft, name: e.target.value })} placeholder="Plan name" />
          <Input value={planDraft.business_line_scope} onChange={(e) => setPlanDraft({ ...planDraft, business_line_scope: e.target.value })} placeholder="Business line" />
          <Input value={planDraft.description} onChange={(e) => setPlanDraft({ ...planDraft, description: e.target.value })} placeholder="Description" />
          <Button className="w-full" onClick={createPlan}>Create annual plan</Button>
          {selectedPlan && <Button variant="outline" className="w-full" onClick={duplicatePlan}>Duplicate selected plan</Button>}
          <div className="space-y-2">
            {annualPlans.map((plan) => (
              <button key={plan.id} type="button" className={`w-full text-left rounded-xl border p-3 ${selectedPlanId === plan.id ? 'border-indigo-500 bg-indigo-50' : 'bg-white'}`} onClick={() => setSelectedPlanId(plan.id)}>
                <p className="font-medium text-slate-900">{plan.name}</p>
                <p className="text-xs text-slate-500">{plan.business_line_scope} • {plan.total_courses || 0} courses</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Plan modules</CardTitle></CardHeader>
        <CardContent className="space-y-3 max-h-[720px] overflow-y-auto">
          {!selectedPlan && <div className="text-sm text-slate-500">Select an annual learning plan to add required education items.</div>}
          {selectedPlan && courses.map((course) => (
            <label key={course.id} className="flex items-start gap-3 rounded-xl border p-3 bg-white">
              <Checkbox checked={selectedCourses.includes(course.id)} onCheckedChange={() => toggleCourse(course.id)} />
              <div>
                <p className="font-medium text-slate-900">{course.title}</p>
                <div className="flex gap-2 mt-2 flex-wrap"><Badge variant="outline">{course.category}</Badge><Badge variant="outline">{course.business_line_scope}</Badge></div>
              </div>
            </label>
          ))}
          {selectedPlan && <Button className="w-full mt-3" onClick={savePlanCourses}>Save plan modules</Button>}
        </CardContent>
      </Card>
    </div>
  );
}