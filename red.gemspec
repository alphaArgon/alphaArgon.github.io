# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "red"
  spec.version       = "0.0"
  spec.authors       = [""]
  spec.summary       = "Jekyll Red Theme"

  spec.files         = `git ls-files -z`.split("\x0").select { |f| f.match(%r!^(assets|_layouts|_includes|_config\.yml)!i) }

  spec.add_runtime_dependency "jekyll", "~> 3.9.0"

end
