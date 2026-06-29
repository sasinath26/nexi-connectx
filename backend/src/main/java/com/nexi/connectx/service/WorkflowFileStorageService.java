package com.nexi.connectx.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * Manages workflow-specific folder structure and file operations.
 *
 * Folder layout:
 *   {baseDir}/{workflowName}/upload/
 *   {baseDir}/{workflowName}/processed/
 *   {baseDir}/{workflowName}/error/
 */
@Service
@Slf4j
public class WorkflowFileStorageService {

    @Value("${nexi.connectx.workflows.base-dir:./workflows}")
    private String baseDir;

    // ── folder helpers ──────────────────────────────────────────────────────

    public Path getUploadDir(String workflowName) {
        return Paths.get(baseDir, workflowName, "upload");
    }

    public Path getProcessedDir(String workflowName) {
        return Paths.get(baseDir, workflowName, "processed");
    }

    public Path getErrorDir(String workflowName) {
        return Paths.get(baseDir, workflowName, "error");
    }

    /**
     * Ensures all three sub-folders exist for a given workflow.
     */
    public void ensureFolders(String workflowName) throws IOException {
        Files.createDirectories(getUploadDir(workflowName));
        Files.createDirectories(getProcessedDir(workflowName));
        Files.createDirectories(getErrorDir(workflowName));
        log.debug("[WorkflowFileStorage] Ensured folders for workflow '{}'", workflowName);
    }

    // ── file operations ─────────────────────────────────────────────────────

    /**
     * Saves a multipart file into the workflow's upload folder.
     *
     * @return the absolute path of the saved file
     */
    public Path saveToUploadFolder(String workflowName, MultipartFile file) throws IOException {
        ensureFolders(workflowName);
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            originalFilename = "upload-" + System.currentTimeMillis();
        }
        Path destination = getUploadDir(workflowName).resolve(originalFilename);
        Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
        log.info("[WorkflowFileStorage] Saved '{}' to {}", originalFilename, destination.toAbsolutePath());
        return destination;
    }

    /**
     * Moves a file from the upload folder to the processed folder.
     */
    public void moveToProcessed(String workflowName, Path filePath) {
        moveTo(workflowName, filePath, getProcessedDir(workflowName), "processed");
    }

    /**
     * Moves a file from the upload folder to the error folder.
     */
    public void moveToError(String workflowName, Path filePath) {
        moveTo(workflowName, filePath, getErrorDir(workflowName), "error");
    }

    private void moveTo(String workflowName, Path source, Path targetDir, String label) {
        try {
            Files.createDirectories(targetDir);
            Path target = targetDir.resolve(source.getFileName());
            Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
            log.info("[WorkflowFileStorage] Moved '{}' → {}/{}", source.getFileName(), workflowName, label);
        } catch (IOException e) {
            log.error("[WorkflowFileStorage] Failed to move file to {} folder: {}", label, e.getMessage());
        }
    }
}

