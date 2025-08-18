#!/usr/bin/env python3
"""
CrewAI Compatibility Patch
Handles runtime compatibility issues including ResponseTextConfig import error
"""

import sys
import logging
from types import ModuleType
from typing import Any, Optional

logger = logging.getLogger(__name__)

class CompatibilityPatcher:
    """Runtime compatibility patches for CrewAI and dependencies"""
    
    def __init__(self):
        self.patches_applied = []
        
    def patch_openai_response_config(self):
        """Patch OpenAI ResponseTextConfig compatibility issue"""
        try:
            import openai.types.responses.response as response_module
            
            # Check if ResponseTextConfig exists
            if not hasattr(response_module, 'ResponseTextConfig'):
                logger.info("Patching ResponseTextConfig compatibility...")
                
                # Check if ResponseFormatTextConfig exists (newer name)
                if hasattr(response_module, 'ResponseFormatTextConfig'):
                    # Create alias for backward compatibility
                    response_module.ResponseTextConfig = response_module.ResponseFormatTextConfig
                    self.patches_applied.append("OpenAI ResponseTextConfig -> ResponseFormatTextConfig alias")
                    logger.info("✅ Applied ResponseTextConfig compatibility patch")
                else:
                    # Create a mock class if neither exists
                    class MockResponseTextConfig:
                        """Mock ResponseTextConfig for compatibility"""
                        def __init__(self, **kwargs):
                            for key, value in kwargs.items():
                                setattr(self, key, value)
                    
                    response_module.ResponseTextConfig = MockResponseTextConfig
                    self.patches_applied.append("OpenAI ResponseTextConfig mock class")
                    logger.info("✅ Applied ResponseTextConfig mock patch")
                    
        except ImportError as e:
            logger.warning(f"Could not patch OpenAI compatibility: {e}")
        except Exception as e:
            logger.error(f"Error applying OpenAI patch: {e}")

    def patch_litellm_imports(self):
        """Patch LiteLLM import issues"""
        try:
            # Pre-patch any known LiteLLM import issues
            import litellm
            
            # Check for common import problems and patch them
            if hasattr(litellm, 'types'):
                litellm_types = litellm.types
                if not hasattr(litellm_types, 'utils'):
                    # Create empty utils module if missing
                    from types import ModuleType
                    litellm_types.utils = ModuleType('utils')
                    self.patches_applied.append("LiteLLM types.utils module")
                    logger.info("✅ Applied LiteLLM utils patch")
                    
        except ImportError as e:
            logger.warning(f"Could not patch LiteLLM: {e}")
        except Exception as e:
            logger.error(f"Error applying LiteLLM patch: {e}")

    def patch_crewai_imports(self):
        """Patch CrewAI import issues"""
        try:
            # Apply any necessary CrewAI compatibility patches
            logger.info("Checking CrewAI imports...")
            
            # Test critical imports
            from crewai import Agent, Task, Crew, Process
            logger.info("✅ Core CrewAI imports successful")
            
            # Test modern features with fallbacks
            try:
                from crewai.project import CrewBase, agent, task, crew
                logger.info("✅ Modern CrewAI decorators available")
            except ImportError:
                logger.warning("⚠️ Modern CrewAI decorators not available, using basic implementation")
                
        except ImportError as e:
            logger.error(f"❌ CrewAI import failed: {e}")
            raise
        except Exception as e:
            logger.error(f"Error checking CrewAI imports: {e}")

    def apply_all_patches(self):
        """Apply all compatibility patches"""
        logger.info("🔧 Applying compatibility patches...")
        
        patches = [
            ("OpenAI ResponseTextConfig", self.patch_openai_response_config),
            ("LiteLLM imports", self.patch_litellm_imports), 
            ("CrewAI imports", self.patch_crewai_imports),
        ]
        
        for patch_name, patch_func in patches:
            try:
                logger.info(f"Applying {patch_name} patch...")
                patch_func()
            except Exception as e:
                logger.error(f"Failed to apply {patch_name} patch: {e}")
        
        if self.patches_applied:
            logger.info(f"✅ Applied {len(self.patches_applied)} compatibility patches:")
            for patch in self.patches_applied:
                logger.info(f"  - {patch}")
        else:
            logger.info("✅ No compatibility patches needed")
        
        return len(self.patches_applied)

def apply_compatibility_patches():
    """Apply all compatibility patches before importing CrewAI"""
    patcher = CompatibilityPatcher()
    return patcher.apply_all_patches()

def safe_import_crewai():
    """Safely import CrewAI with compatibility patches"""
    try:
        # Apply patches first
        patches_applied = apply_compatibility_patches()
        
        # Test core imports
        from crewai import Agent, Task, Crew, Process
        logger.info("✅ CrewAI core imports successful")
        
        # Test tools
        try:
            from crewai.tools import BaseTool
            logger.info("✅ CrewAI tools import successful")
        except ImportError as e:
            logger.warning(f"⚠️ CrewAI tools import failed: {e}")
        
        return True, patches_applied
        
    except Exception as e:
        logger.error(f"❌ CrewAI import failed even with patches: {e}")
        return False, 0

if __name__ == "__main__":
    # Test the patches
    logging.basicConfig(level=logging.INFO)
    success, patches = safe_import_crewai()
    
    if success:
        print(f"🎉 CrewAI imports successful with {patches} patches applied")
        sys.exit(0)
    else:
        print("❌ CrewAI imports failed even with compatibility patches")
        sys.exit(1)