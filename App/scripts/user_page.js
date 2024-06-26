document.addEventListener("DOMContentLoaded", function () {
        // Check if the dark mode setting is being used correctly.
        const useDarkMode = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        console.log("Dark mode is " + (useDarkMode ? "enabled" : "disabled"));

        // Initialize TinyMCE
        tinymce.init({
          selector: "#mce_full",
          resize: false,
          menubar: false,
          setup: function (editor) {
            editor.on("init", function () {
              console.log("Editor is initialized and ready");
              enforceMaxLength(editor); // Check length at initialization
              updateCount(editor);
            });
            editor.on("input", function () {
              updateCount(editor);
              enforceMaxLength(editor); // Enforce max length during typing
            });
            editor.on("change", function () {
              updateCount(editor);
              enforceMaxLength(editor); // Enforce max length after changes
              synchronizeTextarea(editor);
            });
          },
        });

        function updateCount(editor) {
          var content = editor.getContent({ format: "text" });
          var charCount = content.length;
          var wordCount = content.split(/\s+/).filter((n) => n != "").length;
          var countElement = document.getElementById("mce_full-count");
          if (countElement) {
            countElement.innerText = `${charCount} characters, ${wordCount} words`;
          } else {
            console.error(
              'The element with ID "mce_full-count" does not exist.'
            );
          }
        }

        function enforceMaxLength(editor) {
          var content = editor.getContent({ format: "raw" });
          if (content.length > 2000) {
            editor.setContent(content.substr(0, 2000));
            showNotification("Word count exceeds 2000 characters!", 5000);
          }
        }

        function showNotification(message, duration) {
          var notificationElement = document.getElementById(
            "autoSaveNotification"
          );
          if (!notificationElement) {
            console.error("Notification element not found");
            return;
          }
          notificationElement.innerText = message;
          notificationElement.style.display = "block";
          setTimeout(() => {
            notificationElement.style.display = "none";
          }, duration);
        }

        function synchronizeTextarea(editor) {
          document.getElementById("mce_full").value = editor.getContent({
            format: "text",
          });
        }

        document
          .querySelectorAll('input[type="text"], textarea:not(#mce_full)')
          .forEach((input) => {
            input.addEventListener("input", function () {
              var count = this.value.length;
              var max = this.getAttribute("maxlength");
              var countId = this.id + "-count";
              var countElement = document.getElementById(countId);

              if (countElement) {
                countElement.innerText = `${count}/${max}`;
              } else {
                console.error(
                  `The element with ID "${countId}" does not exist.`
                );
              }
            });
          });

        const form = document.querySelector('form[action="/generation"]');
        form.addEventListener("submit", function (event) {
          event.preventDefault();
          synchronizeTextarea(tinymce.get("mce_full"));
          var editorContent = tinymce.get("mce_full").getContent();
          if (editorContent.length > 2000) {
            alert(
              "Text exceeds the maximum allowed length of 2000 characters."
            );
            return false;
          }
          var jobTitle = document.getElementById("job_title").value;
          fetch("/generation", {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `text=${encodeURIComponent(
              editorContent
            )}&job_title=${encodeURIComponent(jobTitle)}`,
          })
            .then((response) => response.text())
            .then((html) => {
              document.getElementById("result").innerHTML = `Result: ${html}`;
            })
            .catch((error) => {
              console.error("Error:", error);
              document.getElementById("result").innerHTML =
                "Error fetching results.";
            });
        });

        (function () {
          var autoSave = new Object();
          (function (obj) {
            obj.configuration = {
              interval: 300, // Auto-save interval in seconds
            };

            obj.bindTimer = function () {
              console.log("bindTimer function called");
              var editor = tinymce.get("mce_full");
              if (!editor) {
                console.error(
                  "The TinyMCE editor instance #mce_full does not exist."
                );
                return;
              }

              var textVal = editor.getContent(); // Correctly call getContent()
              var encodedTextVal = btoa(textVal);
              var ref1 = getCookie("textval-01");
              var ref2 = getCookie("textval-02");

              console.log("Encoded current value:", encodedTextVal); // Debugging output
              console.log("Last saved value (cookie):", ref1); // Debugging output

              if (encodedTextVal != ref1) {
                setCookie("textval-01", encodedTextVal, 7);
                setCookie("textval-02", ref1, 7);
                setCookie("textval-03", ref2, 7);
                showNotification("AUTO SAVED!", 5000);
              } else {
                console.log("No changes detected, not auto-saving"); // Inform if no changes
                showNotification("No change detected!", 5000);
              }
            };

            obj.start = function () {
              obj.bindTimer();
              setTimeout(function () {
                obj.start();
              }, obj.configuration.interval * 1000);
            };

            function setCookie(name, value, days) {
              var expires = "";
              if (days) {
                var date = new Date();
                date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
                expires = "; expires=" + date.toUTCString();
              }
              document.cookie =
                name + "=" + (value || "") + expires + "; path=/";
            }

            function getCookie(name) {
              var nameEQ = name + "=";
              var ca = document.cookie.split(";");
              for (var i = 0; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) == " ") c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) == 0)
                  return c.substring(nameEQ.length, c.length);
              }
              return null;
            }
            obj.start();
          })(autoSave);
        })();
      });