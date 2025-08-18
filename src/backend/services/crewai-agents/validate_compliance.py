#!/usr/bin/env python3
"""
CrewAI Compliance Validation Script
Validates that our implementation follows CrewAI 2025 best practices
"""

import os
import sys
import re
import yaml
from typing import List, Dict

def validate_file_exists(filepath: str, description: str) -> bool:
    """Check if a file exists"""
    if os.path.exists(filepath):
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description}: {filepath} (NOT FOUND)")
        return False

def validate_yaml_structure(filepath: str, required_keys: List[str]) -> bool:
    """Validate YAML file has required structure"""
    try:
        with open(filepath, 'r') as f:
            data = yaml.safe_load(f)
        
        if not isinstance(data, dict):
            print(f"❌ {filepath}: Not a valid YAML dictionary")
            return False
        
        missing_keys = []
        for key in required_keys:
            if key not in data:
                missing_keys.append(key)
        
        if missing_keys:
            print(f"❌ {filepath}: Missing required keys: {missing_keys}")
            return False
        
        print(f"✅ {filepath}: Valid structure with {len(data)} entries")
        return True
    except Exception as e:
        print(f"❌ {filepath}: Error reading YAML: {e}")
        return False

def validate_python_file_patterns(filepath: str, patterns: Dict[str, str]) -> bool:
    """Validate Python file contains expected patterns"""
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        
        results = []
        for pattern_name, pattern in patterns.items():
            if re.search(pattern, content, re.MULTILINE | re.DOTALL):
                print(f"✅ {filepath}: Contains {pattern_name}")
                results.append(True)
            else:
                print(f"❌ {filepath}: Missing {pattern_name}")
                results.append(False)
        
        return all(results)
    except Exception as e:
        print(f"❌ {filepath}: Error reading file: {e}")
        return False

def validate_agent_yaml_compliance():
    """Validate agent YAML follows CrewAI standards"""
    print("\n🔍 Validating Agent Configuration Compliance")
    print("-" * 50)
    
    if not validate_file_exists('config/agents.yaml', 'Agent config file'):
        return False
    
    try:
        with open('config/agents.yaml', 'r') as f:
            agents_config = yaml.safe_load(f)
        
        required_fields = ['role', 'goal', 'backstory']
        optional_fields = ['verbose', 'allow_delegation', 'max_iter', 'memory']
        
        valid_agents = 0
        for agent_name, config in agents_config.items():
            print(f"\n  Validating agent: {agent_name}")
            agent_valid = True
            
            # Check required fields
            for field in required_fields:
                if field in config:
                    print(f"    ✅ {field}: Present")
                else:
                    print(f"    ❌ {field}: MISSING (Required)")
                    agent_valid = False
            
            # Check optional fields (best practices)
            for field in optional_fields:
                if field in config:
                    print(f"    ✅ {field}: {config[field]} (Best practice)")
                else:
                    print(f"    ⚠️  {field}: Not specified (Optional)")
            
            if agent_valid:
                valid_agents += 1
        
        print(f"\n  Summary: {valid_agents}/{len(agents_config)} agents are compliant")
        return valid_agents == len(agents_config)
        
    except Exception as e:
        print(f"❌ Error validating agents: {e}")
        return False

def validate_task_yaml_compliance():
    """Validate task YAML follows CrewAI standards"""
    print("\n🔍 Validating Task Configuration Compliance")
    print("-" * 50)
    
    if not validate_file_exists('config/tasks.yaml', 'Task config file'):
        return False
    
    try:
        with open('config/tasks.yaml', 'r') as f:
            tasks_config = yaml.safe_load(f)
        
        required_fields = ['description', 'expected_output']
        optional_fields = ['agent', 'context', 'tools']
        
        valid_tasks = 0
        for task_name, config in tasks_config.items():
            print(f"\n  Validating task: {task_name}")
            task_valid = True
            
            # Check required fields
            for field in required_fields:
                if field in config:
                    print(f"    ✅ {field}: Present")
                else:
                    print(f"    ❌ {field}: MISSING (Required)")
                    task_valid = False
            
            # Check optional fields
            for field in optional_fields:
                if field in config:
                    print(f"    ✅ {field}: Present (Best practice)")
                else:
                    print(f"    ⚠️  {field}: Not specified (Optional)")
            
            if task_valid:
                valid_tasks += 1
        
        print(f"\n  Summary: {valid_tasks}/{len(tasks_config)} tasks are compliant")
        return valid_tasks == len(tasks_config)
        
    except Exception as e:
        print(f"❌ Error validating tasks: {e}")
        return False

def validate_compliant_implementation():
    """Validate the CrewAI compliant implementation"""
    print("\n🔍 Validating CrewAI Compliant Implementation")
    print("-" * 50)
    
    # Check if compliant file exists
    if not validate_file_exists('main_crewai_compliant.py', 'Compliant implementation'):
        return False
    
    # Define patterns to look for in the compliant implementation
    compliance_patterns = {
        '@CrewBase decorator': r'@CrewBase\s*\nclass\s+\w+',
        '@agent decorators': r'@agent\s*\n\s*def\s+\w+',
        '@task decorators': r'@task\s*\n\s*def\s+\w+', 
        '@crew decorator': r'@crew\s*\n\s*def\s+crew',
        '@before_kickoff': r'@before_kickoff',
        '@after_kickoff': r'@after_kickoff',
        'Pydantic BaseModel': r'class\s+\w+\(BaseModel\):',
        'output_pydantic parameter': r'output_pydantic\s*=',
        'context parameter': r'context\s*=\s*\[',
        'memory=True': r'memory\s*=\s*True',
        'cache=True': r'cache\s*=\s*True',
        'respect_context_window': r'respect_context_window\s*=\s*True',
        'inject_date': r'inject_date\s*=\s*True',
        'reasoning': r'reasoning\s*=\s*True',
        'step_callback': r'step_callback\s*=',
        'task_callback': r'task_callback\s*=',
        'max_rpm': r'max_rpm\s*=',
        'embedder config': r'embedder\s*=\s*{',
    }
    
    return validate_python_file_patterns('main_crewai_compliant.py', compliance_patterns)

def validate_tools_integration():
    """Validate tools follow CrewAI standards"""
    print("\n🔍 Validating Tools Integration")
    print("-" * 50)
    
    if not validate_file_exists('tools/custom_tools.py', 'Custom tools file'):
        return False
    
    tools_patterns = {
        'CrewAI BaseTool import': r'from crewai\.tools import BaseTool',
        'BaseTool inheritance': r'class\s+\w+\(.*BaseTool\):',
        'Pydantic args_schema': r'args_schema:\s*Type\[BaseModel\]',
        '_run method': r'def _run\(',
        'name attribute': r'name:\s*str\s*=',
        'description attribute': r'description:\s*str\s*=',
    }
    
    return validate_python_file_patterns('tools/custom_tools.py', tools_patterns)

def validate_requirements_compatibility():
    """Validate requirements.txt has compatible versions"""
    print("\n🔍 Validating Requirements Compatibility")
    print("-" * 50)
    
    if not validate_file_exists('requirements.txt', 'Requirements file'):
        return False
    
    try:
        with open('requirements.txt', 'r') as f:
            content = f.read()
        
        # Check for version constraints that fix the compatibility issue
        compatibility_checks = {
            'OpenAI version constraint': r'openai.*<.*12',
            'CrewAI tools included': r'crewai\[tools\]',
            'LiteLLM version constraint': r'litellm.*<.*30',
        }
        
        results = []
        for check_name, pattern in compatibility_checks.items():
            if re.search(pattern, content):
                print(f"✅ {check_name}: Found")
                results.append(True)
            else:
                print(f"❌ {check_name}: Not found")
                results.append(False)
        
        return all(results)
        
    except Exception as e:
        print(f"❌ Error reading requirements.txt: {e}")
        return False

def run_full_compliance_validation():
    """Run complete compliance validation"""
    print("🔍 CrewAI 2025 Compliance Validation")
    print("=" * 60)
    
    checks = [
        ("File Structure", lambda: all([
            validate_file_exists('config/', 'Config directory'),
            validate_file_exists('tools/', 'Tools directory'),
            validate_file_exists('main_crewai_compliant.py', 'Compliant implementation'),
        ])),
        ("Agent Configuration", validate_agent_yaml_compliance),
        ("Task Configuration", validate_task_yaml_compliance),
        ("Compliant Implementation", validate_compliant_implementation),
        ("Tools Integration", validate_tools_integration),
        ("Requirements Compatibility", validate_requirements_compatibility),
    ]
    
    results = []
    for check_name, check_func in checks:
        print(f"\n{'='*20} {check_name} {'='*20}")
        try:
            result = check_func()
            results.append(result)
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"\n{check_name}: {status}")
        except Exception as e:
            print(f"\n❌ {check_name}: ERROR - {e}")
            results.append(False)
    
    # Final summary
    print("\n" + "="*60)
    print("🎯 COMPLIANCE VALIDATION SUMMARY")
    print("-"*60)
    
    passed = sum(results)
    total = len(results)
    
    for i, (check_name, _) in enumerate(checks):
        status = "✅ PASS" if results[i] else "❌ FAIL"
        print(f"{status} {check_name}")
    
    print(f"\n📊 Overall Score: {passed}/{total} checks passed")
    
    if passed == total:
        print("\n🎉 FULL COMPLIANCE ACHIEVED!")
        print("✅ Your CrewAI implementation follows all 2025 best practices")
        return True
    else:
        print(f"\n⚠️  PARTIAL COMPLIANCE: {total-passed} issues found")
        print("🔧 Please address the failed checks above")
        return False

if __name__ == "__main__":
    success = run_full_compliance_validation()
    sys.exit(0 if success else 1)