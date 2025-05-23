#!/bin/bash

# Healthcare Telemedicine System - Database Backup Script
# This script creates automated backups of the MongoDB database

# Configuration
DB_NAME="healthcare_telemedicine"
BACKUP_DIR="/backups/healthcare"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if MongoDB is running
check_mongodb() {
    print_status "Checking MongoDB connection..."
    
    if mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1; then
        print_success "MongoDB is running and accessible"
        return 0
    else
        print_error "MongoDB is not accessible"
        print_error "Please ensure MongoDB is running and accessible"
        return 1
    fi
}

# Function to create backup directory
create_backup_dir() {
    print_status "Creating backup directory: $BACKUP_DIR"
    
    if mkdir -p "$BACKUP_DIR"; then
        print_success "Backup directory created/verified"
        return 0
    else
        print_error "Failed to create backup directory"
        return 1
    fi
}

# Function to perform database backup
backup_database() {
    local backup_path="$BACKUP_DIR/$DATE"
    
    print_status "Starting database backup..."
    print_status "Database: $DB_NAME"
    print_status "Backup path: $backup_path"
    
    # Create timestamped backup
    if mongodump --db "$DB_NAME" --out "$backup_path" --quiet; then
        print_success "Database backup completed"
        
        # Get backup size
        local backup_size=$(du -sh "$backup_path" | cut -f1)
        print_status "Backup size: $backup_size"
        
        return 0
    else
        print_error "Database backup failed"
        return 1
    fi
}

# Function to compress backup
compress_backup() {
    local backup_path="$BACKUP_DIR/$DATE"
    local compressed_file="$BACKUP_DIR/healthcare_backup_$DATE.tar.gz"
    
    print_status "Compressing backup..."
    
    if tar -czf "$compressed_file" -C "$BACKUP_DIR" "$DATE"; then
        print_success "Backup compressed: healthcare_backup_$DATE.tar.gz"
        
        # Remove uncompressed backup
        rm -rf "$backup_path"
        print_status "Uncompressed backup removed"
        
        # Get compressed size
        local compressed_size=$(du -sh "$compressed_file" | cut -f1)
        print_status "Compressed size: $compressed_size"
        
        return 0
    else
        print_error "Backup compression failed"
        return 1
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    print_status "Cleaning up backups older than $RETENTION_DAYS days..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        rm -f "$file"
        ((deleted_count++))
        print_status "Deleted: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "healthcare_backup_*.tar.gz" -mtime +$RETENTION_DAYS -print0)
    
    if [ $deleted_count -eq 0 ]; then
        print_status "No old backups to clean up"
    else
        print_success "Cleaned up $deleted_count old backup(s)"
    fi
}

# Function to verify backup
verify_backup() {
    local compressed_file="$BACKUP_DIR/healthcare_backup_$DATE.tar.gz"
    
    print_status "Verifying backup integrity..."
    
    if tar -tzf "$compressed_file" > /dev/null 2>&1; then
        print_success "Backup verification passed"
        return 0
    else
        print_error "Backup verification failed"
        return 1
    fi
}

# Function to list recent backups
list_backups() {
    print_status "Recent backups:"
    
    if ls -la "$BACKUP_DIR"/healthcare_backup_*.tar.gz 2>/dev/null | tail -5; then
        echo ""
    else
        print_warning "No backup files found"
    fi
}

# Function to show backup statistics
show_statistics() {
    local total_backups=$(ls -1 "$BACKUP_DIR"/healthcare_backup_*.tar.gz 2>/dev/null | wc -l)
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    
    print_status "Backup Statistics:"
    echo "  Total backups: $total_backups"
    echo "  Total backup size: $total_size"
    echo "  Retention period: $RETENTION_DAYS days"
    echo "  Latest backup: healthcare_backup_$DATE.tar.gz"
}

# Function to send notification (placeholder for email/webhook)
send_notification() {
    local status=$1
    local message=$2
    
    # This is a placeholder for notification system
    # You can integrate with email, Slack, or other notification services
    
    if [ "$status" = "success" ]; then
        print_success "Backup notification: $message"
    else
        print_error "Backup notification: $message"
    fi
    
    # Example: Send email notification
    # echo "$message" | mail -s "Healthcare DB Backup $status" admin@healthcare.com
    
    # Example: Send Slack notification
    # curl -X POST -H 'Content-type: application/json' \
    #   --data "{\"text\":\"Healthcare DB Backup $status: $message\"}" \
    #   YOUR_SLACK_WEBHOOK_URL
}

# Main backup function
main() {
    echo "🏥 Healthcare Telemedicine System - Database Backup"
    echo "=================================================="
    echo "Started at: $(date)"
    echo ""
    
    # Check prerequisites
    if ! command -v mongodump &> /dev/null; then
        print_error "mongodump command not found"
        print_error "Please install MongoDB Database Tools"
        exit 1
    fi
    
    # Perform backup steps
    if check_mongodb && \
       create_backup_dir && \
       backup_database && \
       compress_backup && \
       verify_backup; then
        
        # Cleanup old backups
        cleanup_old_backups
        
        # Show statistics
        show_statistics
        
        # List recent backups
        list_backups
        
        # Send success notification
        send_notification "success" "Database backup completed successfully"
        
        print_success "Backup process completed successfully!"
        echo "Backup file: healthcare_backup_$DATE.tar.gz"
        
        exit 0
    else
        send_notification "failed" "Database backup process failed"
        print_error "Backup process failed!"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Healthcare Database Backup Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --list, -l     List recent backups"
        echo "  --verify FILE  Verify a backup file"
        echo "  --restore FILE Restore from a backup file"
        echo ""
        echo "Configuration:"
        echo "  Database: $DB_NAME"
        echo "  Backup directory: $BACKUP_DIR"
        echo "  Retention: $RETENTION_DAYS days"
        exit 0
        ;;
    --list|-l)
        list_backups
        exit 0
        ;;
    --verify)
        if [ -z "$2" ]; then
            print_error "Please specify backup file to verify"
            exit 1
        fi
        if tar -tzf "$2" > /dev/null 2>&1; then
            print_success "Backup file is valid: $2"
        else
            print_error "Backup file is corrupted: $2"
            exit 1
        fi
        exit 0
        ;;
    --restore)
        if [ -z "$2" ]; then
            print_error "Please specify backup file to restore"
            exit 1
        fi
        print_warning "This will restore the database from: $2"
        print_warning "Current data will be replaced!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            # Extract and restore
            temp_dir="/tmp/healthcare_restore_$$"
            mkdir -p "$temp_dir"
            tar -xzf "$2" -C "$temp_dir"
            if mongorestore --db "$DB_NAME" --drop "$temp_dir"/*/"$DB_NAME"; then
                print_success "Database restored successfully"
            else
                print_error "Database restore failed"
                exit 1
            fi
            rm -rf "$temp_dir"
        else
            print_status "Restore cancelled"
        fi
        exit 0
        ;;
    "")
        # Run main backup process
        main
        ;;
    *)
        print_error "Unknown option: $1"
        print_status "Use --help for usage information"
        exit 1
        ;;
esac
