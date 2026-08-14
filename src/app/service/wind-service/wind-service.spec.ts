import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WindService } from './wind-service';

describe('WindService', () => {
  let component: WindService;
  let fixture: ComponentFixture<WindService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WindService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WindService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
