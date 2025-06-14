import unittest
import json
import os
import tempfile
import shutil

# Define the absolute path to the project root.
# Adjust this if your test script is located differently relative to the project root.
PROJECT_ROOT_ABS = "/c%3A/Users/Miki_gabay/Desktop/Workspace/Synapse" # Adjusted to match your user_info

# Placeholder for your MCP client.
# You'll need to initialize and use your actual MCP client here.
# class McpClient:
#     def mcp_taskmaster_ai_analyze_project_complexity(self, projectRoot, file, output, threshold=None, research=None, model=None):
#         # Replace with actual MCP call
#         print(f"Mock MCP Call: analyze_project_complexity on {file} output to {output}")
#         # Simulate report creation for testing flow
#         if os.path.exists(file):
#             try:
#                 with open(file, 'r') as f_in, open(output, 'w') as f_out:
#                     tasks_data = json.load(f_in)
#                     report_data = {"tasks": []}
#                     for i, task in enumerate(tasks_data.get("tasks", [])):
#                         report_data["tasks"].append({
#                             "id": task.get("id", str(i+1)),
#                             "title": task.get("title", "Unknown Task"),
#                             "complexityScore": 5, # Mock score
#                             "recommendation": "review",
#                             "reasoning": "Mocked analysis"
#                         })
#                 json.dump(report_data, f_out)
#                 return {"success": True, "message": "Analysis complete", "report_path": output}
#             except Exception as e:
#                 return {"success": False, "message": str(e)}
#         return {"success": False, "message": "Input tasks file not found."}

#     def mcp_taskmaster_ai_complexity_report(self, projectRoot, file):
#         # Replace with actual MCP call
#         print(f"Mock MCP Call: complexity_report on {file}")
#         # Simulate report formatting for testing flow
#         if os.path.exists(file):
#             try:
#                 with open(file, 'r') as f:
#                     report_data = json.load(f)
#                 formatted_report = "Complexity Report:\\n"
#                 for task_report in report_data.get("tasks", []):
#                     formatted_report += f"- Task {task_report.get('id')}: {task_report.get('title')} - Score: {task_report.get('complexityScore')}\\n"
#                 return {"success": True, "formatted_report": formatted_report}
#             except Exception as e:
#                 return {"success": False, "message": str(e)}
#         return {"success": False, "message": "Report file not found."}

# mcp_client = McpClient() # Initialize your MCP client here

class TestSummarizationDashboard(unittest.TestCase):

    def setUp(self):
        # Create a temporary directory for test files
        self.test_dir = tempfile.mkdtemp()
        self.mock_mcp_client = True # Set to False if you integrate a real MCP client above

        # This is a mock client for demonstrating the test structure.
        # Replace with your actual MCP client interactions.
        if self.mock_mcp_client:
            class MockMcpClient:
                def mcp_taskmaster_ai_analyze_project_complexity(self, projectRoot, file, output, threshold=None, research=None, model=None):
                    if not os.path.exists(os.path.dirname(output)):
                        os.makedirs(os.path.dirname(output), exist_ok=True)
                    tasks_in = []
                    if os.path.exists(file):
                        with open(file, 'r') as f:
                            tasks_in = json.load(f).get("tasks", [])
                    
                    report_tasks = []
                    for idx, task in enumerate(tasks_in):
                        score = 5 # Default
                        if "complex" in task.get("title", "").lower():
                            score = 8
                        elif "simple" in task.get("title", "").lower():
                            score = 2
                        
                        recommendation = "review"
                        if threshold is not None: 
                            if score >= threshold:
                                recommendation = "expand"
                        elif score > 6: 
                             recommendation = "expand"

                        report_tasks.append({
                            "id": task.get("id", str(idx + 1)),
                            "title": task.get("title"),
                            "complexityScore": score,
                            "recommendation": recommendation,
                            "reasoning": "Automated analysis"
                        })
                    with open(output, 'w') as f_out:
                        json.dump({"tasks": report_tasks, "summary": "Mocked complexity report"}, f_out)
                    return {"success": True, "message": "Analysis complete", "report_path": output}

                def mcp_taskmaster_ai_complexity_report(self, projectRoot, file):
                    if not os.path.exists(file):
                        return {"success": False, "message": "Report file not found for dashboard."}
                    with open(file, 'r') as f_in:
                        data = json.load(f_in)
                    
                    output_str = "Task Master - Complexity Report\\n"
                    output_str += "===================================\\n"
                    for task in data.get("tasks", []):
                        output_str += f"ID: {task.get('id')} - {task.get('title')}\\n"
                        output_str += f"  Complexity: {task.get('complexityScore')}/10\\n"
                        output_str += f"  Recommendation: {task.get('recommendation')}\\n"
                        output_str += f"  Reasoning: {task.get('reasoning', 'N/A')}\\n---\\n"
                    output_str += f"Report Summary: {data.get('summary', 'N/A')}\\n"
                    return {"success": True, "formatted_report": output_str}
            self.mcp_client = MockMcpClient()
        # else:
        #     # self.mcp_client = mcp_client # Your actual initialized client
        #     pass


    def tearDown(self):
        # Remove the temporary directory and its contents
        shutil.rmtree(self.test_dir)

    def _create_test_tasks_json(self, tasks_data, filename="tasks.json"):
        """Helper to create a tasks.json file in the test directory."""
        path = os.path.join(self.test_dir, filename)
        with open(path, 'w') as f:
            json.dump({"tasks": tasks_data}, f)
        return path

    def test_basic_analysis_and_dashboard_view(self):
        """Test basic complexity analysis and its dashboard representation."""
        tasks = [
            {"id": "1", "title": "Setup project", "description": "Initial project setup.", "status": "pending", "dependencies": [], "priority": "high"},
            {"id": "2", "title": "Implement feature X", "description": "A moderately complex feature.", "status": "pending", "dependencies": ["1"], "priority": "medium"}
        ]
        test_tasks_path = self._create_test_tasks_json(tasks)
        test_report_output_path = os.path.join(self.test_dir, "report.json")

        # 1. Run analyze_project_complexity
        analysis_result = self.mcp_client.mcp_taskmaster_ai_analyze_project_complexity(
            projectRoot=PROJECT_ROOT_ABS,
            file=test_tasks_path, # Path to the tasks.json to analyze
            output=test_report_output_path # Path where the report JSON should be saved
        )
        self.assertTrue(analysis_result.get("success"), f"Analysis MCP call failed: {analysis_result.get('message')}")
        self.assertTrue(os.path.exists(test_report_output_path), "Complexity report JSON file was not created.")

        # 2. Validate the generated JSON report
        with open(test_report_output_path, 'r') as f:
            report_data = json.load(f)
        
        self.assertIn("tasks", report_data)
        self.assertEqual(len(report_data["tasks"]), len(tasks))
        for task_report in report_data["tasks"]:
            self.assertIn("id", task_report)
            self.assertIn("title", task_report)
            self.assertIn("complexityScore", task_report)
            self.assertIn("recommendation", task_report)

        # 3. Run complexity_report (dashboard view)
        dashboard_result = self.mcp_client.mcp_taskmaster_ai_complexity_report(
            projectRoot=PROJECT_ROOT_ABS,
            file=test_report_output_path # Path to the report.json to display
        )
        self.assertTrue(dashboard_result.get("success"), f"Dashboard MCP call failed: {dashboard_result.get('message')}")
        
        # 4. Validate the dashboard string (assuming it's returned)
        formatted_report = dashboard_result.get("formatted_report")
        self.assertIsNotNone(formatted_report, "Formatted report string was not returned.")
        self.assertIn("Task Master - Complexity Report", formatted_report)
        self.assertIn(tasks[0]["title"], formatted_report)
        self.assertIn(tasks[1]["title"], formatted_report)

    def test_empty_tasks_analysis(self):
        """Test analysis when there are no tasks."""
        test_tasks_path = self._create_test_tasks_json([])
        test_report_output_path = os.path.join(self.test_dir, "empty_report.json")

        analysis_result = self.mcp_client.mcp_taskmaster_ai_analyze_project_complexity(
            projectRoot=PROJECT_ROOT_ABS,
            file=test_tasks_path,
            output=test_report_output_path
        )
        self.assertTrue(analysis_result.get("success"))
        self.assertTrue(os.path.exists(test_report_output_path))

        with open(test_report_output_path, 'r') as f:
            report_data = json.load(f)
        self.assertEqual(len(report_data.get("tasks", [])), 0)

        dashboard_result = self.mcp_client.mcp_taskmaster_ai_complexity_report(
            projectRoot=PROJECT_ROOT_ABS,
            file=test_report_output_path
        )
        self.assertTrue(dashboard_result.get("success"))
        formatted_report = dashboard_result.get("formatted_report")
        self.assertIn("Task Master - Complexity Report", formatted_report)
        self.assertNotIn("ID: 1", formatted_report) # Assuming no tasks means no specific task lines

    def test_complexity_variance_and_recommendations(self):
        """Test tasks with different expected complexities and their recommendations."""
        tasks = [
            {"id": "S1", "title": "A very simple task", "description": "Easy one.", "status": "pending"},
            {"id": "C1", "title": "A very complex task involving multiple systems", "description": "Hard one.", "status": "pending"}
        ]
        test_tasks_path = self._create_test_tasks_json(tasks)
        test_report_output_path = os.path.join(self.test_dir, "variance_report.json")

        analysis_result = self.mcp_client.mcp_taskmaster_ai_analyze_project_complexity(
            projectRoot=PROJECT_ROOT_ABS,
            file=test_tasks_path,
            output=test_report_output_path
        )
        self.assertTrue(analysis_result.get("success"))
        
        with open(test_report_output_path, 'r') as f:
            report_data = json.load(f)
        
        simple_task_report = next((t for t in report_data["tasks"] if t["id"] == "S1"), None)
        complex_task_report = next((t for t in report_data["tasks"] if t["id"] == "C1"), None)

        self.assertIsNotNone(simple_task_report)
        self.assertIsNotNone(complex_task_report)

        self.assertTrue(simple_task_report["complexityScore"] < complex_task_report["complexityScore"])
        
        if not self.mock_mcp_client: 
             self.assertIn(complex_task_report["recommendation"].lower(), ["expand", "review"]) 
        else: 
            self.assertEqual(complex_task_report["recommendation"], "expand")
            self.assertEqual(simple_task_report["recommendation"], "review")


    def test_threshold_impact_on_recommendations(self):
        """Test how the threshold parameter affects expansion recommendations."""
        tasks_for_mock = [
            {"id": "T1", "title": "Simple Task for Threshold", "description": "...", "status": "pending"}, # Mock score 2
            {"id": "T2", "title": "Complex Task for Threshold", "description": "...", "status": "pending"} # Mock score 8
        ]
        test_tasks_path = self._create_test_tasks_json(tasks_for_mock)
        
        # Test with a high threshold
        high_thresh_report_path = os.path.join(self.test_dir, "high_thresh_report.json")
        analysis_high = self.mcp_client.mcp_taskmaster_ai_analyze_project_complexity(
            projectRoot=PROJECT_ROOT_ABS,
            file=test_tasks_path,
            output=high_thresh_report_path,
            threshold=9 # Mock: T1 (2) not expand, T2 (8) not expand
        )
        self.assertTrue(analysis_high.get("success"))
        with open(high_thresh_report_path, 'r') as f:
            report_high = json.load(f)
        self.assertEqual(report_high["tasks"][0]["recommendation"], "review") # T1
        self.assertEqual(report_high["tasks"][1]["recommendation"], "review") # T2
        
        # Test with a low threshold
        low_thresh_report_path = os.path.join(self.test_dir, "low_thresh_report.json")
        analysis_low = self.mcp_client.mcp_taskmaster_ai_analyze_project_complexity(
            projectRoot=PROJECT_ROOT_ABS,
            file=test_tasks_path,
            output=low_thresh_report_path,
            threshold=3 # Mock: T1 (2) not expand, T2 (8) expand
        )
        self.assertTrue(analysis_low.get("success"))
        with open(low_thresh_report_path, 'r') as f:
            report_low = json.load(f)
        self.assertEqual(report_low["tasks"][0]["recommendation"], "review")    # T1
        self.assertEqual(report_low["tasks"][1]["recommendation"], "expand") # T2


if __name__ == '__main__':
    unittest.main(argv=['first-arg-is-ignored'], exit=False)
