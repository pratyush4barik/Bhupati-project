"use client";

import { useMemo, useState } from "react";
import { AddMembersStep } from "@/app/groups/_components/add-members-step";
import { AvailablePlans } from "@/app/groups/_components/available-plans";
import { GroupSteps } from "@/app/groups/_components/group-steps";
import type { ActiveSubscription, GroupMemberInput } from "@/app/groups/types";

type GroupsBuilderProps = {
  plans: ActiveSubscription[];
  ownerName: string;
};

const createMember = (): GroupMemberInput => ({
  id: crypto.randomUUID(),
  email: "",
  percentage: 0,
});

export function GroupsBuilder({ plans, ownerName }: GroupsBuilderProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedPlan, setSelectedPlan] = useState<ActiveSubscription | null>(null);
  const [groupName, setGroupName] = useState("");
  const [ownerPercentage, setOwnerPercentage] = useState(100);
  const [members, setMembers] = useState<GroupMemberInput[]>([createMember()]);

  const selectedPlanId = selectedPlan?.id;

  const handleSelectPlan = (plan: ActiveSubscription) => {
    setSelectedPlan(plan);
    setCurrentStep(2);
  };

  const handleAddMember = () => {
    setMembers((prev) => [...prev, createMember()]);
  };

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => {
      const index = prev.findIndex((member) => member.id === id);
      // Keep first member row non-removable (owner + first member rule).
      if (index <= 0) return prev;
      return prev.filter((member) => member.id !== id);
    });
  };

  const handleMemberEmailChange = (id: string, value: string) => {
    setMembers((prev) =>
      prev.map((member) => (member.id === id ? { ...member, email: value } : member)),
    );
  };

  const handleMemberPercentageChange = (id: string, value: number) => {
    const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
    setMembers((prev) =>
      prev.map((member) =>
        member.id === id ? { ...member, percentage: safeValue } : member,
      ),
    );
  };

  const safeOwnerPercentage = useMemo(
    () => Math.max(0, Math.min(100, ownerPercentage)),
    [ownerPercentage],
  );

  return (
    <>
      <GroupSteps currentStep={currentStep} />

      {currentStep === 1 ? (
        <AvailablePlans
          onSelectPlan={handleSelectPlan}
          plans={plans}
          selectedPlanId={selectedPlanId}
        />
      ) : null}

      {currentStep === 2 && selectedPlan ? (
        <AddMembersStep
          groupName={groupName}
          members={members}
          onAddMember={handleAddMember}
          onGroupNameChange={setGroupName}
          onMemberEmailChange={handleMemberEmailChange}
          onMemberPercentageChange={handleMemberPercentageChange}
          onRemoveMember={handleRemoveMember}
          onOwnerPercentageChange={setOwnerPercentage}
          ownerName={ownerName}
          ownerPercentage={safeOwnerPercentage}
          selectedPlan={selectedPlan}
        />
      ) : null}
    </>
  );
}
