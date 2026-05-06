from __future__ import annotations

from typing import Any


def resolve_instance_id_from_ip(ip: str, region: str | None) -> dict[str, Any]:
    try:
        import boto3
    except ImportError:
        return {"ok": False, "detail": "boto3 not installed"}

    ec2 = boto3.client("ec2", region_name=region) if region else boto3.client("ec2")

    def collect_instance_ids(filters: list[dict[str, Any]]) -> list[str]:
        resp = ec2.describe_instances(Filters=filters)
        ids: list[str] = []
        for reservation in resp.get("Reservations", []):
            for inst in reservation.get("Instances", []):
                iid = inst.get("InstanceId")
                state = (inst.get("State") or {}).get("Name")
                if iid and state != "terminated":
                    ids.append(str(iid))
        return ids

    ids = collect_instance_ids([{"Name": "private-ip-address", "Values": [ip]}])
    if not ids:
        ids = collect_instance_ids([{"Name": "ip-address", "Values": [ip]}])

    if not ids:
        return {"ok": False, "detail": "No EC2 instance found for that IP in this region/account."}
    if len(ids) > 1:
        return {"ok": False, "detail": "Multiple instances matched the IP; resolve ambiguity manually."}

    return {"ok": True, "instance_id": ids[0]}


def verify_ssm_target(instance_id: str, region: str | None) -> dict[str, Any]:
    """
    Lightweight operational check: instance exists and is managed by SSM when possible.
    Requires boto3 credentials from the environment/instance profile.
    """
    try:
        import boto3
    except ImportError:
        return {"ok": False, "detail": "boto3 not installed"}

    ec2 = boto3.client("ec2", region_name=region) if region else boto3.client("ec2")
    try:
        resp = ec2.describe_instances(InstanceIds=[instance_id])
        reservations = resp.get("Reservations", [])
        if not reservations:
            return {"ok": False, "detail": "instance not found"}
    except Exception as exc:
        return {"ok": False, "detail": f"ec2.describe_instances failed: {exc}"}

    try:
        ssm = boto3.client("ssm", region_name=region) if region else boto3.client("ssm")
        paginator = ssm.get_paginator("describe_instance_information")
        found = False
        for page in paginator.paginate():
            for info in page.get("InstanceInformationList", []):
                if info.get("InstanceId") == instance_id:
                    found = True
                    break
            if found:
                break
        return {
            "ok": True,
            "instance_id": instance_id,
            "ssm_managed": found,
            "start_session_hint": (
                f"aws ssm start-session --target {instance_id}"
                + (f" --region {region}" if region else "")
            ),
        }
    except Exception as exc:
        return {
            "ok": True,
            "instance_id": instance_id,
            "ssm_managed": None,
            "detail": f"ssm lookup skipped/failed: {exc}",
            "start_session_hint": (
                f"aws ssm start-session --target {instance_id}"
                + (f" --region {region}" if region else "")
            ),
        }


def ec2_access_precheck(ip: str, region: str | None) -> dict[str, Any]:
    resolved = resolve_instance_id_from_ip(ip, region)
    if not resolved.get("ok"):
        return {"ok": False, "resolved": resolved, "ssm": None}

    instance_id = str(resolved["instance_id"])
    ssm = verify_ssm_target(instance_id, region)
    return {"ok": bool(ssm.get("ok")), "resolved": resolved, "ssm": ssm}
