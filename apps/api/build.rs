use std::{error::Error, fs, path::Path};

fn main() -> Result<(), Box<dyn Error>> {
    let migrations_dir = Path::new("migrations");

    println!("cargo:rerun-if-changed={}", migrations_dir.display());

    for entry in fs::read_dir(migrations_dir)? {
        let path = entry?.path();
        if path.extension().and_then(|extension| extension.to_str()) == Some("sql") {
            println!("cargo:rerun-if-changed={}", path.display());
        }
    }

    Ok(())
}
