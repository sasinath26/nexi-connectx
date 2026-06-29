package com.nexi.connectx.workflow.plugins;

import com.nexi.connectx.service.WorkflowFileStorageService;
import com.nexi.connectx.workflow.engine.WorkflowExecutionContext;
import com.nexi.connectx.workflow.engine.WorkflowPluginExecutor;
import com.nexi.connectx.workflow.model.PluginType;
import com.nexi.connectx.workflow.model.WorkflowNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.stream.Stream;

/**
 * Reads a file from disk.
 *
 * Resolution order for the source directory:
 *   1. "inputDir" from the node's configJson (explicit override)
 *   2. Workflow-specific upload folder:  ./workflows/{workflowCode}/upload/
 *
 * After a successful read the file is moved to the "processed" folder.
 * On failure it is moved to the "error" folder.
 *
 * Sets the raw file content as the context payload so downstream
 * transform nodes can process it.
 */
@Component
@RequiredArgsConstructor
@Slf4j
class FileUploadPlugin implements WorkflowPluginExecutor {

    private final WorkflowFileStorageService fileStorageService;

    @Override
    public PluginType getPluginType() { return PluginType.FILE_UPLOAD; }

    @Override
    public void execute(WorkflowExecutionContext context, WorkflowNode node) throws Exception {
        Map<String, Object> cfg = context.getNodeConfig(node);

        String explicitInputDir = cfg.getOrDefault("inputDir", "").toString().trim();
        String filePattern      = cfg.getOrDefault("filePattern", "*.csv").toString().trim();
        String encodingStr      = cfg.getOrDefault("encoding", "UTF-8").toString().trim();
        boolean recursive       = "true".equalsIgnoreCase(cfg.getOrDefault("recursiveScan", "false").toString());

        // ── Resolve source directory ────────────────────────────────────────
        Path dir;
        boolean useWorkflowFolder;
        if (!explicitInputDir.isEmpty()) {
            dir = Paths.get(explicitInputDir);
            useWorkflowFolder = false;
            log.info("[FileUpload] Using explicit inputDir: {}", dir.toAbsolutePath());
        } else if (context.getWorkflowCode() != null && !context.getWorkflowCode().isBlank()) {
            String workflowCode = context.getWorkflowCode();
            fileStorageService.ensureFolders(workflowCode);
            dir = fileStorageService.getUploadDir(workflowCode);
            useWorkflowFolder = true;
            log.info("[FileUpload] Using workflow upload folder: {}", dir.toAbsolutePath());
        } else {
            log.warn("[FileUpload] No inputDir and no workflowCode – passing through existing payload");
            detectAndSetFormat(context);
            return;
        }

        if (!Files.exists(dir) || !Files.isDirectory(dir)) {
            throw new IllegalArgumentException(
                    "[FileUpload] Directory does not exist or is not a directory: " + dir.toAbsolutePath());
        }

        Charset charset;
        try { charset = Charset.forName(encodingStr); }
        catch (Exception e) { charset = StandardCharsets.UTF_8; }

        // ── Find matching files ─────────────────────────────────────────────
        final PathMatcher matcher = FileSystems.getDefault().getPathMatcher("glob:" + filePattern);
        List<Path> matched = new ArrayList<>();
        try (Stream<Path> stream = recursive ? Files.walk(dir) : Files.list(dir)) {
            stream.filter(Files::isRegularFile)
                  .filter(p -> matcher.matches(p.getFileName()))
                  .sorted()
                  .forEach(matched::add);
        }

        if (matched.isEmpty()) {
            throw new IllegalStateException(
                    "[FileUpload] No files matched pattern '" + filePattern + "' in " + dir.toAbsolutePath());
        }

        Path target = matched.get(0);
        log.info("[FileUpload] Reading file: {}", target.toAbsolutePath());

        // ── Read file ───────────────────────────────────────────────────────
        String content;
        try {
            content = Files.readString(target, charset);
        } catch (Exception readEx) {
            if (useWorkflowFolder) {
                fileStorageService.moveToError(context.getWorkflowCode(), target);
            }
            throw readEx;
        }

        context.setPayload(content);
        context.setFormat("CSV");
        context.setVariable("sourceFile", target.toAbsolutePath().toString());
        context.setVariable("sourceFileName", target.getFileName().toString());
        context.setVariable("fileCount", matched.size());

        log.info("[FileUpload] Loaded {} bytes from {}", content.length(), target.getFileName());

        // ── Move to processed ───────────────────────────────────────────────
        if (useWorkflowFolder) {
            fileStorageService.moveToProcessed(context.getWorkflowCode(), target);
        }
    }

    private void detectAndSetFormat(WorkflowExecutionContext context) {
        String body = context.getPayload();
        if (body == null) { context.setFormat("JSON"); return; }
        String t = body.trim();
        if (t.startsWith("<"))                           context.setFormat("XML");
        else if (t.contains(",") && !t.startsWith("{")) context.setFormat("CSV");
        else                                             context.setFormat("JSON");
    }
}

// ── SFTP ──────────────────────────────────────────────────────────────────

@Component
class SftpReadPlugin implements WorkflowPluginExecutor {
    @Override public PluginType getPluginType() { return PluginType.SFTP_READ; }
    @Override public void execute(WorkflowExecutionContext context, WorkflowNode node) { /* pass-through */ }
}

// ── REST API ──────────────────────────────────────────────────────────────

@Component
class RestApiPlugin implements WorkflowPluginExecutor {
    @Override public PluginType getPluginType() { return PluginType.REST_API; }
    @Override public void execute(WorkflowExecutionContext context, WorkflowNode node) { /* pass-through */ }
}

// ── Kafka Consumer ────────────────────────────────────────────────────────

@Component
class KafkaConsumerPlugin implements WorkflowPluginExecutor {
    @Override public PluginType getPluginType() { return PluginType.KAFKA_CONSUMER; }
    @Override public void execute(WorkflowExecutionContext context, WorkflowNode node) { /* pass-through */ }
}

// ── Manual Trigger ────────────────────────────────────────────────────────

@Component
class ManualTriggerPlugin implements WorkflowPluginExecutor {
    @Override public PluginType getPluginType() { return PluginType.MANUAL_TRIGGER; }
    @Override public void execute(WorkflowExecutionContext context, WorkflowNode node) { /* pass-through */ }
}

// ── Parallel Split ────────────────────────────────────────────────────────

@Component
class ParallelSplitPlugin implements WorkflowPluginExecutor {
    @Override public PluginType getPluginType() { return PluginType.PARALLEL_SPLIT; }
    @Override public void execute(WorkflowExecutionContext context, WorkflowNode node) {
        context.setVariable("parallelMode", true);
    }
}

// ── Parallel Join ─────────────────────────────────────────────────────────

@Component
class ParallelJoinPlugin implements WorkflowPluginExecutor {
    @Override public PluginType getPluginType() { return PluginType.PARALLEL_JOIN; }
    @Override public void execute(WorkflowExecutionContext context, WorkflowNode node) {
        context.setVariable("parallelMode", false);
    }
}

// ── Conditional Branch ────────────────────────────────────────────────────

@Component
class ConditionalBranchPlugin implements WorkflowPluginExecutor {
    @Override public PluginType getPluginType() { return PluginType.CONDITIONAL_BRANCH; }
    @Override public void execute(WorkflowExecutionContext context, WorkflowNode node) {
        String field = context.getNodeConfig(node).getOrDefault("conditionField", "branch").toString();
        context.setVariable("conditionField", field);
    }
}
